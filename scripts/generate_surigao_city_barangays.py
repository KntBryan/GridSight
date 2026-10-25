import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Geodatabase" / "surigao_city_barangays.geojson"
OPTIONS_OUTPUT = ROOT / "src" / "lib" / "surigao-city-barangays.ts"
MIGRATION_OUTPUT_DIR = ROOT / "supabase" / "migrations"
SQL_EDITOR_CHUNK_BYTES = 400_000


def sql_text(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def seed_statement(rows: list[str]) -> str:
    return (
        "insert into public.areas (slug, name, city, province, region, location, area_type, psgc_code, boundary) values\n"
        + ",\n".join(rows)
        + "\non conflict (slug) do update set\n"
        "  name = excluded.name,\n"
        "  city = excluded.city,\n"
        "  province = excluded.province,\n"
        "  region = excluded.region,\n"
        "  location = excluded.location,\n"
        "  area_type = excluded.area_type,\n"
        "  psgc_code = excluded.psgc_code,\n"
        "  boundary = excluded.boundary;\n"
    )


def main() -> None:
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    features = data["features"]

    option_rows = []
    seed_rows = []
    for feature in features:
        props = feature["properties"]
        code = props["adm4_pcode"]
        slug = code.lower()
        name = props["adm4_name"]
        latitude = props["center_lat"]
        longitude = props["center_lon"]

        option_rows.append(
            "  { name: "
            + json.dumps(name, ensure_ascii=False)
            + ", slug: "
            + json.dumps(slug)
            + ", code: "
            + json.dumps(code)
            + f", latitude: {latitude}, longitude: {longitude} }},"
        )

        geometry = json.dumps(
            feature["geometry"], separators=(",", ":"), ensure_ascii=False, allow_nan=False
        ).replace("'", "''")
        point = (
            "extensions.st_setsrid(extensions.st_makepoint("
            f"{longitude:.11f}, {latitude:.11f}), 4326)::extensions.geography"
        )
        boundary = (
            "extensions.st_setsrid(extensions.st_geomfromgeojson("
            f"'{geometry}'), 4326)::extensions.geometry(MultiPolygon, 4326)"
        )
        seed_rows.append(
            "  ("
            + ", ".join(
                [
                    sql_text(slug),
                    sql_text(name),
                    sql_text("Surigao City"),
                    sql_text("Surigao del Norte"),
                    sql_text("Region XIII (Caraga)"),
                    point,
                    sql_text("barangay"),
                    sql_text(code),
                    boundary,
                ]
            )
            + ")"
        )

    options = (
        "export type BarangayOption = { name: string; slug: string; code: string; latitude: number; longitude: number };\n\n"
        "export const SURIGAO_CITY_BARANGAYS: BarangayOption[] = [\n"
        + "\n".join(option_rows)
        + "\n];\n"
    )
    OPTIONS_OUTPUT.write_text(options, encoding="utf-8")

    chunks: list[list[str]] = []
    current_chunk: list[str] = []
    for row in seed_rows:
        candidate = current_chunk + [row]
        if current_chunk and len(seed_statement(candidate).encode("utf-8")) > SQL_EDITOR_CHUNK_BYTES:
            chunks.append(current_chunk)
            current_chunk = [row]
        else:
            current_chunk = candidate
    if current_chunk:
        chunks.append(current_chunk)

    MIGRATION_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    chunk_sizes = []
    for index, chunk in enumerate(chunks, start=1):
        chunk_header = (
            f"-- Surigao City barangay data migration part {index:02d} of {len(chunks):02d}.\n"
            "-- Surigao City barangays filtered from HDX COD-AB-PHL, sourced from NAMRIA and PSA.\n"
            "-- Boundaries are WGS 84 / EPSG:4326; PSGC codes identify each barangay.\n"
        )
        chunk_text = chunk_header + seed_statement(chunk)
        migration_version = index + 2
        chunk_path = MIGRATION_OUTPUT_DIR / f"{migration_version:04d}_surigaocity_barangay_data_part_{index:02d}.sql"
        chunk_path.write_text(chunk_text, encoding="utf-8")
        chunk_sizes.append(chunk_path.stat().st_size)

    print(f"Generated {len(features)} barangay options and boundary rows.")
    print(f"Generated {len(chunks)} numbered data migrations; largest is {max(chunk_sizes):,} bytes.")


if __name__ == "__main__":
    main()
