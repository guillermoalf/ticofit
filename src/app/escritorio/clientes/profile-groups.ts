import { PROFILE_GROUPS, type FieldGroup } from "@/lib/clients/fields";

/** The sheet's profile plus what only the gym sets: sede and join date. */
export function profileFormGroups(sedes: { id: string; name: string }[]): FieldGroup[] {
  return [
    {
      title: "En el club",
      fields: [
        {
          name: "sede_id",
          label: "Sede",
          type: "select",
          required: true,
          options: sedes.map((s) => ({ value: s.id, label: s.name })),
        },
        { name: "join_date", label: "Fecha de ingreso", type: "date", required: true },
      ],
    },
    ...PROFILE_GROUPS,
  ];
}
