import { redirect } from "next/navigation";

// /welcome was the marketing homepage before it became the site's actual
// homepage at /. Redirect so any bookmarked or shared /welcome links keep working.
export default function WelcomeRedirect() {
  redirect("/");
}
