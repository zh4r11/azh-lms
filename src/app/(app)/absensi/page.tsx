import { redirect } from "next/navigation";

/** Attendance now lives in each pertemuan of a kursus; old links land on the kursus list. */
export default function AbsensiIndex() {
  redirect("/belajar");
}
