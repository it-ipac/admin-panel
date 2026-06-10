import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Parse .env manually
let url = "https://fqynbudvpvpiljdrrvem.supabase.co";
let anonKey = "sb_publishable_dfuVrEfuwxJE4wVSw6mxcg_W5qV7iTs";

try {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim();
      if (key === "VITE_SUPABASE_URL") url = val;
      if (key === "VITE_SUPABASE_ANON_KEY") anonKey = val;
    }
  }
} catch (e) {
  console.log("No .env found or failed to parse, using defaults");
}

console.log("Connecting to:", url);
const supabase = createClient(url, anonKey);

async function main() {
  const { data: instances, error } = await supabase
    .from("order_pkg_instance")
    .select("id, ipac_reference, destination, tag, instance_number")
    .limit(30);
    
  if (error) {
    console.error("Error fetching instances:", error);
    return;
  }
  
  console.log("Found instances:", JSON.stringify(instances, null, 2));
}

main();
