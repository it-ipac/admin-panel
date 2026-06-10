import { createClient } from "@supabase/supabase-js";

const url = "https://fqynbudvpvpiljdrrvem.supabase.co";
const anonKey = "sb_publishable_dfuVrEfuwxJE4wVSw6mxcg_W5qV7iTs";
const supabase = createClient(url, anonKey);

async function main() {
  const { data, error } = await supabase.from("clients").select("id, name");
  if (error) {
    console.error("Clients error:", error);
    return;
  }
  console.log("Clients:", data);
}
main();
