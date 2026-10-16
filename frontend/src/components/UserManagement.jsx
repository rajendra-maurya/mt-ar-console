import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, fetchUsers, updateUser } from "../api/usersApi.js";

const ROLES = ["analyst", "lead", "controller", "admin"];

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("analyst");
  const [message, setMessage] = useState("");

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setName("");
      setEmail("");
      setPassword("");
      setRole("analyst");
      setMessage("User created successfully.");
    },
    onError: (error) => setMessage(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => updateUser(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setMessage("User updated successfully.");
    },
    onError: (error) => setMessage(error.message),
  });

  function handleCreate(event) {
    event.preventDefault();
    setMessage("");

    createMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
    });
  }

  if (usersQuery.isPending) {
    return <p className="p-6">Loading users…</p>;
  }

  if (usersQuery.isError) {
    return (
      <p className="p-6 text-red-700" role="alert">
        Unable to load users: {usersQuery.error.message}
      </p>
    );
  }

  // Support either a direct array or { users: [...] } API response.
  const users = Array.isArray(usersQuery.data)
    ? usersQuery.data
    : (usersQuery.data?.data ?? usersQuery.data?.users ?? []);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">User Management</h2>
        <p className="mt-1 text-sm text-gray-600">
          Create users and manage their roles and account access.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2"
      >
        <h3 className="font-semibold sm:col-span-2">Create user</h3>

        <label className="grid gap-1 text-sm">
          Full name
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-lg border p-2"
            autoComplete="name"
          />
        </label>

        <label className="grid gap-1 text-sm">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-lg border p-2"
            autoComplete="email"
          />
        </label>

        <label className="grid gap-1 text-sm">
          Temporary password
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-lg border p-2"
            autoComplete="new-password"
          />
        </label>

        <label className="grid gap-1 text-sm">
          Role
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="rounded-lg border p-2"
          >
            {ROLES.map((item) => (
              <option key={item} value={item}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-lg bg-[#244BA6] px-4 py-2 font-medium text-white disabled:opacity-50 sm:col-span-2 sm:justify-self-start"
        >
          {createMutation.isPending ? "Creating…" : "Create user"}
        </button>

        {message && (
          <p role="status" className="text-sm sm:col-span-2">
            {message}
          </p>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Account</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {users.map((user) => {
              const userId = user.id ?? user.userId;
              const active =
                user.active === 1 ||
                user.active === true ||
                user.active === "1";

              return (
                <tr key={userId}>
                  <td className="p-3">{user.name}</td>
                  <td className="p-3">{user.email}</td>

                  <td className="p-3">
                    <select
                      aria-label={`Role for ${user.email}`}
                      value={user.role?.toLowerCase() ?? "analyst"}
                      onChange={(event) => {
                        setMessage("");
                        updateMutation.mutate({
                          id: userId,
                          updates: { role: event.target.value },
                        });
                      }}
                      className="rounded border p-2"
                    >
                      {ROLES.map((item) => (
                        <option key={item} value={item}>
                          {item.charAt(0).toUpperCase() + item.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="p-3">{active ? "Active" : "Inactive"}</td>

                  <td className="p-3">
                    <button
                      type="button"
                      disabled={updateMutation.isPending}
                      onClick={() => {
                        setMessage("");
                        updateMutation.mutate({
                          id: userId,
                          updates: { active: !active },
                        });
                      }}
                      className="rounded border px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              );
            })}

            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="p-5 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
