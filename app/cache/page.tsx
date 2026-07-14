import { redirect } from "next/navigation";

export default function CachePage(): never {
  redirect("/settings/cache");
}
