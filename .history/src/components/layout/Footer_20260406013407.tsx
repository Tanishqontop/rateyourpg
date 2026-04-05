import { Link } from "react-router-dom";
import { School, MapPin, Heart, Github, Twitter } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-stone-200 bg-stone-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          
          {/* Brand Section */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white font-bold">
                R
              </div>
              <span className="text-xl font-bold tracking-tight text-stone-900">
                RateYourPG
              </span>
            </Link>
            <p className="mt-4 text-sm leading-6 text-stone-500">
              India's first community-driven PG review platform. Helping students and professionals find safe, clean, and honest stays.
            </p>
            <div className="mt-6 flex gap-4">
              <a href="#" className="text-stone-400 hover:text-stone-600 transition">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-stone-400 hover:text-stone-600 transition">
                <Github size={20} />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">Explore</h3>
            <ul className="mt-4 space-y-2 text-sm text-stone-600">
              <li><Link to="/explore" className="hover:text-teal-600">All Locations</Link></li>
              <li><Link to="/search?type=college" className="hover:text-teal-600">Top Colleges</Link></li>
              <li><Link to="/search?type=area" className="hover:text-teal-600">Popular Areas</Link></li>
              <li><Link to="/verify" className="hover:text-teal-600">Verify a PG</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">Support</h3>
            <ul className="mt-4 space-y-2 text-sm text-stone-600">
              <li><Link to="/about" className="hover:text-teal-600">About Us</Link></li>
              <li><Link to="/guidelines" className="hover:text-teal-600">Review Guidelines</Link></li>
              <li><Link to="/privacy" className="hover:text-teal-600">Privacy Policy</Link></li>
              <li><Link to="/contact" className="hover:text-teal-600">Contact Support</Link></li>
            </ul>
          </div>

          {/* Trust Badge */}
          <div className="rounded-2xl bg-teal-600 p-6 text-white">
            <h3 className="text-sm font-bold uppercase">Join the community</h3>
            <p className="mt-2 text-xs leading-relaxed opacity-90">
              Know a PG that's great (or terrible)? Your review helps someone else stay safe.
            </p>
            <Link 
              to="/?write=1" 
              className="mt-4 inline-block w-full rounded-xl bg-white px-4 py-2 text-center text-xs font-bold text-teal-600 hover:bg-stone-50"
            >
              Write a Review
            </Link>
          </div>
        </div>

        <div className="mt-12 border-t border-stone-200 pt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-stone-400">
            © {currentYear} RateYourPG. All rights reserved.
          </p>
          <p className="flex items-center gap-1 text-xs text-stone-400">
            Made with <Heart size={12} className="text-red-500 fill-red-500" /> in India
          </p>
        </div>
      </div>
    </footer>
  );
}