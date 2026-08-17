import { redirect } from "next/navigation";

export default function SubscriptionRedirect() {
  redirect("/subscription/mine");
}
