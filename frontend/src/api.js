export async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || 'something went wrong')
  }

  return data
}
