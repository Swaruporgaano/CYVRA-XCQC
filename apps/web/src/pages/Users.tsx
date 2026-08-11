import { useEffect, useState } from "react";
import { apiGet, useAuth } from "../auth";

export function UsersPage() {
  const { token, apiBase } = useAuth();
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ users: Array<Record<string, unknown>> }>("/tenants/tenant-lab/users", token, apiBase)
      .then((d) => setUsers(d.users))
      .catch((e) => setError(String(e)));
  }, [token, apiBase]);

  return (
    <>
      <h1>Users</h1>
      <p className="lede">Role hierarchy enforced on API. UI only hides controls.</p>
      {error && <div className="panel">{error}</div>}
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={String(u.userId)}>
                <td>{String(u.displayName)}</td>
                <td>{String(u.email)}</td>
                <td>
                  <code>{String(u.role)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
