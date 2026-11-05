// Serves the site's static files, and the email sign-up on the coming-soon
// page. This runs on the server, so the visitor's browser never contacts Kit
// and gets no Kit cookie.

const kitForm = "https://app.kit.com/forms/10083291/subscriptions";

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/subscribe" && request.method === "POST") return subscribe(request);
    return env.ASSETS.fetch(request);
  },
};

async function subscribe(request) {
  const form = await request.formData();
  const email = String(form.get("email_address") ?? "").trim();
  // Only bots fill in the hidden field; let them think it worked.
  if (form.get("website")) return reply(request, 200, "Now check your email to confirm your subscription.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return reply(request, 400, "Please enter a valid email address.");
  }

  try {
    const response = await fetch(kitForm, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ email_address: email }),
    });
    const result = await response.json().catch(() => null);
    if (response.ok && result?.status !== "failed") {
      return reply(request, 200, "Now check your email to confirm your subscription.");
    }
    console.error(`Kit sign-up failed: ${response.status}`);
  } catch (error) {
    console.error(error);
  }
  return reply(request, 502, "That didn't go through. Please try again in a moment.");
}

// The page's script asks for JSON; without JavaScript the form returns home.
function reply(request, status, message) {
  if ((request.headers.get("accept") ?? "").includes("application/json")) {
    return Response.json({ message }, { status });
  }
  return new Response(null, { status: 303, headers: { location: "/" } });
}
