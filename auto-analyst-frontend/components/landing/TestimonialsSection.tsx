import React from 'react';
import Image from 'next/image';

export default function TestimonialsSection() {
  const testimonials = [
    {
      quote: "Auto-Analyst transformed our data analysis workflow completely. What used to take days now takes minutes.",
      author: "Sarah Johnson",
      role: "Data Scientist at TechCorp",
      avatar: "/testimonials/avatar1.jpg"
    },
    {
      quote: "The insights we've gained through Auto-Analyst have directly contributed to a 27% increase in our quarterly revenue.",
      author: "Michael Chen",
      role: "CEO of GrowthStartup",
      avatar: "/testimonials/avatar2.jpg"
    },
    {
      quote: "I'm amazed at how accurate the predictions are. Auto-Analyst has become an essential tool for our business planning.",
      author: "Jessica Williams",
      role: "Marketing Director at BrandCo",
      avatar: "/testimonials/avatar3.jpg"
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center text-gray-800 mb-12">
          What Our Users Say
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 relative rounded-full overflow-hidden mr-4">
                  <Image 
                    src={testimonial.avatar || "https://via.placeholder.com/100"} 
                    alt={testimonial.author}
                    width={48}
                    height={48}
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{testimonial.author}</h4>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </div>
              <p className="text-gray-700 italic">"{testimonial.quote}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 