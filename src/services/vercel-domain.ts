// Using global fetch available in Node 18+

/**
 * Request Vercel to add a custom domain alias for the project.
 * @param projectId - Vercel project ID (from env VERCEL_PROJECT_ID)
 * @param domain - The custom domain to add (e.g., shop.example.com)
 */
export async function requestDomainAlias(projectId: string, domain: string) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error('VERCEL_TOKEN is not set');
  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/domains`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: domain }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to add domain: ${res.status} ${err}`);
  }
  return res.json();
}

/**
 * Check the verification status of a domain in Vercel.
 * @param domain - The domain to check.
 */
export async function checkDomainStatus(domain: string) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error('VERCEL_TOKEN is not set');
  const res = await fetch(`https://api.vercel.com/v6/domains/${domain}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get domain status: ${res.status} ${err}`);
  }
  return res.json();
}
