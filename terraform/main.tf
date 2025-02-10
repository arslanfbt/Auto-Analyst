resource "aws_amplify_app" "nextjs_app" {
  name        = "auto-analyst-frontend"
  repository  = "https://github.com/Ashad001/Auto-Analyst-CS"
  oauth_token = var.github_oauth_token  # Use secure variable

  build_spec = <<EOT
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd auto-analyst-frontend
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: auto-analyst-frontend/.next
    files:
      - '**/*'
  cache:
    paths:
      - auto-analyst-frontend/node_modules/**/*
EOT
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.nextjs_app.id
  branch_name = "main"
}
