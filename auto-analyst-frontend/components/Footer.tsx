"use client";
import Image from "next/image";
import { Newspaper } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2">
              <Image
                src="https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/Auto-analysts%20icon%20small-S682Oi8nbFhOADUHXJSD9d0KtSWKCe.png"
                alt="Auto-Analyst Logo"
                width={150}
                height={40}
                className="mb-2"
                style={{ width: "40px", height: "auto" }}
              />
              <h1 className="text-2xl font-bold">Auto-Analyst</h1>
            </div>
            <p className="text-gray-300">
              Transforming data into actionable insights
            </p>
            <div className="mt-4 text-sm text-gray-400 flex items-center gap-1">
              Made by{" "}
              <Image
                src="https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/20x20%20icon-5zjC17IFXIcvOzFbGSHl5b0hIQT1s3.png"
                alt="FireBirdTech Logo"
                width={20}
                height={20}
              />{" "}
              <a
                href="https://www.firebird-technologies.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF7F7F] hover:text-[#FF6666]"
              >
                FireBirdTech
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-gray-400">
              <li>Features</li>
              <li>Pricing</li>
              <li>Documentation</li>
              <li>API</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-gray-400">
              <li>About</li>
              <li>Blog</li>
              <li>Careers</li>
              <li>Contact</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-gray-400">
              <li>Privacy</li>
              <li>Terms</li>
              <li>Security</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800 flex justify-between items-center">
          <p>
            &copy; {new Date().getFullYear()} Auto-Analyst. All rights reserved.
          </p>

          <a
            href="https://www.firebird-technologies.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-400 hover:text-[#FF7F7F] transition-colors"
            title="Follow us on Substack"
          >
            <Newspaper className="w-5 h-5" />
            <span className="text-sm">Follow our Blog</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
