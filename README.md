# RateYourPG: Honest PG Reviews & Discovery

## 🚀 India's First Community-Driven PG Review Platform

RateYourPG is a digital platform dedicated to solving the trust and verification gap in the Indian Paying Guest (PG), hostel, and co-living market. Built on the principle of "Made by Residents, For Residents," it empowers students and working professionals to share honest feedback and discover safe, clean, and trustworthy accommodations.

## 🌟 The Problem We Solve

Finding the right accommodation in India often involves navigating misleading photos, hidden curfews, and inconsistent service quality (food, hygiene, safety). RateYourPG provides a transparent, centralized hub where real experiences define a property’s reputation.

## 🛠 Key Features

The platform offers distinct tools for both residents (reviewers) and seekers.

### 🔍 Search & Discovery
Discover accommodations based on real ratings rather than marketing material.

* **Fuzzy Location Search:** Find PGs near specific college campuses, metro stations, or popular areas (e.g., BTM, RVCE, Manish Nagar).
* **Smart Filtering:** Filter results by budget (e.g., Low, Mid), gender type (Boys, Girls, Coliving), and sort by "Most Reviewed" or "Top Rated."

### 📝 Honest Reviews
Submit structured, detailed feedback to help the community.

* **Rating Snapshot:** Rate key criteria including Food Quality, Cleanliness, Safety & Security, Value for Money, and Owner Behavior.
* **Text Feedback:** share nuanced experiences with a dedicated "Detailed Feedback" section.
* **Media Uploads:** Attach real photos or videos of the room, food, or common areas.
* **Quick Tags:** Quickly identify a property’s vibe with common emojis/labels (e.g., 🥬 Veg Food, 🧹 Daily Cleaning).
* **Verified vs. Guest Posts:** Submit as a registered user (with optional anonymity) or as a quick Guest post.

### 🏢 Property Details
Get a realistic view of the accommodation.

* **Resident Vibe Check:** View an AI-generated summary of the collective resident experience (e.g., "People love the food").
* **Quick Facts:** Access standardized, essential data on Curfew, Deposit, and Verification status.
* **Aggregated Metrics:** See performance bars across core criteria (Food, Hygiene, Safety, Overall).
* **Photo Gallery:** View images contributed by both owners and verified residents.

## 👨‍💻 Technical Architecture 

* **Frontend:** React, TypeScript, Tailwind CSS
* **Routing/Navigation:** React Router
* **State Management/UI:** UseAuth Context, Lucide React (Icons), Radix UI/Shadcn components (Cards, Buttons, Badges).
* **Backend:** Supabase (Database, Auth, Storage, Edge Functions).

### 🤖 AI-Powered Insights

RateYourPG utilizes AI models (integrated via Supabase Edge Functions) to analyze large volumes of text reviews and automatically generate a "Resident Vibe Check" summary, providing seekers with instant consensus.

### 🛡 Trust and Verification

To ensure platform integrity, we implement several verification layers:

1. **User Trust Badges:** Display "Verified Resident" or "Community Contributor" markers.
2. **Supabase Verification:** Properties can be marked as `is_verified` following internal check protocols.
3. **Storage Security:** Review images are securely stored using Supabase Storage with signed URL protocols.

## 🗺 Localized Example (UI Insight)

A live example from our Nagpur deployment:
* **Property:** YUVRAJYA Boys pg
* **Location:** New Manish Nagar, Nagpur
* **Price Range:** ₹10k–₹20k
* **Featured Reviews:** Structured feedback highlights 3.3⭐ Food Quality, 3.3⭐ Cleanliness, and 3.3⭐ Safety.

## 🤝 Community and Contribution

We prioritize resident safety. Our platform guidelines require all amenities to be verified in person before payment is made.

If you know a great (or terrible) PG, you can help thousands of others stay safe by contributing your honest review.

---

Made with ❤️ in Bengaluru.

© 2026 RateYourPG. All rights reserved.
