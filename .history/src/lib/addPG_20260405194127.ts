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
    // 1. CREATE LOCATION (SAFE)
    // =========================
    let locationId = null;

    const { data: locationData, error: locationError } =
      await supabase
        .from("locations")
        .insert([
          {
            name: form.area || "Unknown",
            slug: (form.area || "unknown")
              .toLowerCase()
              .replace(/\s+/g, "-"),
            city: "Bangalore",
          },
        ])
        .select()
        .single();

    if (locationError) {
      console.error("LOCATION ERROR:", locationError);
      throw locationError;
    }

    locationId = locationData.id;

    // =========================
    // 2. UPLOAD IMAGE
    // =========================
    let imageUrl = null;

    if (files && files.length > 0) {
      const file = files[0];
      const filePath = `pgs/${Date.now()}-${file.name}`;

      const { data: uploadData, error: uploadError } =
        await supabase.storage
          .from("pg-media")
          .upload(filePath, file);

      if (uploadError) {
        console.error("UPLOAD ERROR:", uploadError);
        throw uploadError;
      }

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
    // 4. INSERT PG (FINAL)
    // =========================
    const { data, error } = await supabase
      .from("pgs")
      .insert([
        {
          name: form.name || "Untitled PG",
          slug: slug,
          location_id: locationId,

          gender_type: "boys", // force for now
          created_by_user: true,
          is_verified: false,

          area: form.area || "Unknown",
          amenities: form.amenities || [],
          room_types: form.room_types || [],
          curfew: form.curfew || "No restriction",
          visitor_allowed: form.visitorsAllowed === "Yes",
          deposit: form.deposit ? Number(form.deposit) : null,
          description: form.description || null,
          cover_image_url: imageUrl,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("PG INSERT ERROR:", error);
      throw error;
    }

    return data;
  } catch (err: any) {
    console.error("FINAL ERROR:", err);
    throw err;
  }
}
