import { getSupabase } from "@/lib/supabase";

export async function handleAddPG({
  form,
  files,
}: {
  form: any;
  files: File[];
}) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not initialized");

  try {
    // =========================
    // 1. GET OR CREATE LOCATION
    // =========================
    let locationId: string | null = null;

    const locationName = form.area || "Unknown";

    // Try to find existing location
    const { data: existingLocation } = await supabase
      .from("locations")
      .select("id")
      .ilike("name", locationName)
      .maybeSingle();

    if (existingLocation) {
      locationId = existingLocation.id;
    } else {
      // Create new location
      const { data: newLocation, error: locError } = await supabase
        .from("locations")
        .insert([
          {
            name: locationName,
            slug: locationName.toLowerCase().replace(/\s+/g, "-"),
            city: "Bangalore",
          },
        ])
        .select()
        .single();

      if (locError) throw locError;
      locationId = newLocation.id;
    }

    // =========================
    // 2. UPLOAD IMAGE
    // =========================
    let imageUrl: string | null = null;

    if (files && files.length > 0) {
      const file = files[0];
      const filePath = `pgs/${Date.now()}-${file.name}`;

      const { data: uploadData, error: uploadError } =
        await supabase.storage
          .from("pg-media")
          .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("pg-media")
        .getPublicUrl(uploadData.path);

      imageUrl = publicUrlData.publicUrl;
    }

    // =========================
    // 3. GENERATE SLUG
    // =========================
    const slug =
      (form.name || "pg")
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-") +
      "-" +
      Date.now();

    // =========================
    // 4. INSERT PG
    // =========================
    const { data, error } = await supabase
      .from("pgs")
      .insert([
        {
          name: form.name || "Untitled PG",
          slug: slug,

          // 🔥 FIXED FOREIGN KEY
          location_id: locationId,

          // REQUIRED FIELDS
          gender_type: form.gender_type || "boys",
          created_by_user: true,
          is_verified: false,

          // NORMAL FIELDS
          area: form.area || "Unknown",
          price_range: form.price_range || null,
          amenities: form.amenities || [],
          room_types: form.room_types || [],
          curfew:
            form.curfew && form.curfew !== "no"
              ? form.curfew
              : "No restriction",
          visitor_allowed: form.visitorsAllowed === "Yes",
          deposit: form.deposit ? Number(form.deposit) : null,
          description: form.description || null,
          cover_image_url: imageUrl,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("INSERT ERROR:", error);
      throw error;
    }

    return data;
  } catch (err: any) {
    console.error("ADD PG FAILED:", err.message);
    throw err;
  }
}