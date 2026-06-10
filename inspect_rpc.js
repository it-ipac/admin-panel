import { createClient } from "@supabase/supabase-js";
import fs from "fs";

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
} catch (e) {}

const supabase = createClient(url, anonKey);

async function main() {
  const { data, error } = await supabase.rpc("fetch_report_instances", {
    p_client_id: null,
    p_order_ids: null,
    p_date_from: null,
    p_date_to: null,
    p_date_mode: "item_packed_at",
    p_destinations: null,
    p_has_items_only: false,
    p_tag_ids: null
  });
  
  if (error) {
    console.error("RPC Error:", error);
    return;
  }
  
  console.log("Returned data length:", data ? data.length : 0);
  if (data && data.length > 0) {
    console.log("First instance:", JSON.stringify(data[0], null, 2));
    console.log("Unique tags present in data:", [...new Set(data.map(d => d.tag).filter(Boolean))]);
  }
}

main();
