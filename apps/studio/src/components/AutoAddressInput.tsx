import { addressFromNames } from "@wbsk/content";
import { useEffect } from "react";
import { set, useClient, useFormValue, type SlugInputProps } from "sanity";

/** The address is made from the names, and stays put once published so links never break. */
export function AutoAddressInput(props: SlugInputProps) {
  const client = useClient({ apiVersion: "2026-11-01" });
  const first = useFormValue(["firstName"]) as string | undefined;
  const second = useFormValue(["secondName"]) as string | undefined;
  const date = useFormValue(["weddingDate"]) as string | undefined;
  const id = useFormValue(["_id"]) as string | undefined;
  const { onChange, value } = props;
  const current = value?.current;

  useEffect(() => {
    if (!first || !second || !id) return;
    const cleanId = id.replace(/^drafts\./, "");
    let cancelled = false;
    void (async () => {
      const published = await client.fetch<string | null>(`*[_id == $id][0].address.current`, { id: cleanId });
      if (cancelled || published) return;
      const base = addressFromNames(first, second);
      const clash = await client.fetch<number>(
        `count(*[_type == "wedding" && address.current == $base && !(_id in [$id, "drafts." + $id])])`,
        { base, id: cleanId },
      );
      const next = clash && date ? `${base}-${date.slice(0, 4)}` : base;
      if (!cancelled && next !== current) onChange(set({ _type: "slug", current: next }));
    })();
    return () => {
      cancelled = true;
    };
  }, [first, second, date, id, current, client, onChange]);

  return (
    <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgb(35 28 22 / 0.05)", fontSize: 14 }}>
      {current ? `/client/${current}/` : "Fill in both names and the address appears here."}
    </div>
  );
}
