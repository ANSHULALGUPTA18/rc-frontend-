import { redirect } from "next/navigation";

export default function DatabasePage(): never {
  redirect("/settings/database");
}
