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
    // 1. UPLOAD IMAGE
    // =========================
    let imageUrl = null;

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
    // 2. GENERATE SLUG
    // =========================
    const slug = (form.name || "pg")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-") + "-" + Date.now();

    // =========================
    // 3. INSERT INTO DB
    // =========================
    const { data, error } = await supabase
      .from("pgs")
      .insert([
        {
          name: form.name || "Untitled PG",
          slug: slug,

          // 🔥 CRITICAL FIXES
          location_id: form.location_id || null,
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