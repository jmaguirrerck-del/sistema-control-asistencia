import MarkClient from "./MarkClient";

export default async function MarcarPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const params = await searchParams;
  return <MarkClient token={params.t || ""} />;
}
