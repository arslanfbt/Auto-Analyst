export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe configuration error' }, { status: 500 });
    }

    const userId = token.sub;
    const body = await request.json();
    const { setupIntentId, subscriptionId, paymentIntentId, planName, interval, amount } = body;

    // Check for existing active subscription
    const existingSubscription = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId));
    if (existingSubscription && ['active'].includes(existingSubscription.status as string)) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        subscriptionId: existingSubscription.stripeSubscriptionId || subscriptionId,
        message: 'Subscription already active',
        subscription: existingSubscription
      });
    }

    if (!setupIntentId) {
      return NextResponse.json({ error: 'Setup Intent ID is required' }, { status: 400 });
    }

    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    if (setupIntent.status !== 'succeeded') {
      return NextResponse.json({
        error: 'Payment method setup not completed.',
        setupStatus: setupIntent.status
      }, { status: 400 });
    }

    const metadata = setupIntent.metadata;
    const priceId = metadata?.priceId;
    const customerId = setupIntent.customer as string;
    const couponId = metadata?.couponId;

    if (!priceId || !customerId) {
      return NextResponse.json({ error: 'Missing payment information' }, { status: 400 });
    }

    await redis.set(`stripe:customer:${customerId}`, String(userId));

    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
      payment_behavior: 'default_incomplete',
      default_payment_method: setupIntent.payment_method as string,
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      metadata: {
        userId,
        planName: metadata.planName || planName || 'Standard',
        interval: metadata.interval || interval || 'month',
        priceId,
        createdFromSetupIntent: setupIntentId,
      },
    };

    if (couponId) {
      subscriptionParams.discounts = [{ coupon: couponId }];
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    if (!['active', 'incomplete', 'past_due'].includes(subscription.status)) {
      return NextResponse.json({
        error: 'Failed to create subscription',
        subscriptionStatus: subscription.status
      }, { status: 500 });
    }

    const now = new Date();
    const creditResetDate = new Date(now);
    creditResetDate.setMonth(creditResetDate.getMonth() + 1);

    const subscriptionData = {
      plan: 'Standard Plan',
      planType: 'STANDARD',
      status: subscription.status,
      amount: amount?.toString() || '15',
      interval: interval || 'month',
      purchaseDate: now.toISOString(),
      creditResetDate: creditResetDate.toISOString().split('T')[0],
      lastUpdated: now.toISOString(),
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id
    };

    // Initialize paid credits (not trial)
    await creditUtils.initializePaidCredits(userId, subscription.id); // you may need to rename or define this
    await redis.hset(KEYS.USER_CREDITS(userId), {
      resetDate: creditResetDate.toISOString().split('T')[0]
    });
    await redis.hset(KEYS.USER_SUBSCRIPTION(userId), subscriptionData);

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      subscription: subscriptionData,
      message: 'Subscription started successfully!'
    });

  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json({ error: error.message || 'Subscription error' }, { status: 500 });
  }
}
