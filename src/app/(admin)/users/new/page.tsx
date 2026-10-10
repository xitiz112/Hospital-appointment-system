import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserForm } from "@/components/admin/user-actions";

export default function NewUserPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/users" className="text-sm text-muted-foreground hover:text-primary">
          ← Users
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Add user</h1>
        <p className="text-sm text-muted-foreground">Create an administrator or patient account.</p>
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Account details</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm />
        </CardContent>
      </Card>
    </div>
  );
}
