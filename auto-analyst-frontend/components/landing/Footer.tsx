"use client";
import Image from "next/image";
import { Newspaper } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/Auto-analysts%20icon%20small-S682Oi8nbFhOADUHXJSD9d0KtSWKCe.png"
              alt="Auto-Analyst Logo"
              width={120}
              height={32}
              className="mb-1"
              style={{ width: "32px", height: "auto" }}
            />
            <h1 className="text-xl font-bold">Auto-Analyst</h1>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="text-xs text-gray-400 flex items-center gap-1">
              Made by{" "}
              <Image
                src="https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/20x20%20icon-5zjC17IFXIcvOzFbGSHl5b0hIQT1s3.png"
                alt="FireBirdTech Logo"
                width={16}
                height={16}
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

            <div className="flex items-center gap-3">
              <a 
                href="/pricing" 
                className="text-gray-400 hover:text-[#FF7F7F] transition-colors text-sm"
              >
                Pricing
              </a>
              <a
                href="https://www.firebird-technologies.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-gray-400 hover:text-[#FF7F7F] transition-colors text-sm"
                title="Follow us on Substack"
              >
                <Newspaper className="w-4 h-4" />
                <span>Follow our Blog</span>
              </a>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} Auto-Analyst. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
