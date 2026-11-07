import type { Metadata } from "next";
import AuthForm from "@/app/components/auth-form";

export const metadata: Metadata = { title: "註冊｜會記" };

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
