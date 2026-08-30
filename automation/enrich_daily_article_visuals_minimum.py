from __future__ import annotations

import automation.enrich_daily_article_visuals as visuals


def comparison_spec_by_minimum(summaries: dict[str, dict]) -> dict | None:
    """Build the major-city comparison from each city's lowest observed price.

    Individual city charts keep showing average prices; only the cross-city comparison
    uses minimum observed prices, as this is the metric readers use when comparing
    where the cheapest available fuel was observed.
    """
    rows = []
    for city in visuals.MAJOR_CITIES:
        summary = summaries.get(city, {})
        row = {"city": city}
        has_value = False
        for fuel, key in (("Бензин A95", "a95"), ("Дизел", "diesel"), ("LPG", "lpg")):
            item = summary.get(fuel)
            if item:
                row[key] = round(float(item["minimum"]), 2)
                has_value = True
            else:
                row[key] = None
        if has_value:
            rows.append(row)

    if len(rows) < 2:
        return None

    distinct_by_fuel = {}
    for key in ("a95", "diesel", "lpg"):
        values = {row[key] for row in rows if row.get(key) is not None}
        distinct_by_fuel[key] = len(values)

    note = (
        "Сравнението използва най-ниската реално наблюдавана цена за съответното гориво във всеки град, "
        f"като се включват само град/гориво комбинации с поне {visuals.MIN_CITY_FUEL_OBSERVATIONS} наблюдения."
    )
    if all(value_count <= 1 for value_count in distinct_by_fuel.values()):
        note += " За тази дата най-ниските цени след закръгляне до втория знак съвпадат между наличните градове."

    return {
        "type": "comparison",
        "title": "Най-ниски цени на горивата в големите градове",
        "subtitle": "Най-ниска наблюдавана цена: София, Пловдив, Варна, Бургас, Русе и Стара Загора",
        "series": [
            {"key": "a95", "label": "Бензин A95"},
            {"key": "diesel", "label": "Дизел"},
            {"key": "lpg", "label": "Газ (LPG)"},
        ],
        "data": rows,
        "note": note,
    }


def main() -> None:
    visuals.comparison_spec = comparison_spec_by_minimum
    date_str = visuals.resolve_date()
    by_day = visuals.get_snapshots(date_str)

    # Diagnostic output now checks the same metric that the comparison chart uses.
    day_rows = by_day[date_str]
    summaries = {city: visuals.city_summary(day_rows, city) for city in visuals.MAJOR_CITIES}
    for fuel in ("Бензин A95", "Дизел", "LPG"):
        city_values = [
            (city, round(float(summary[fuel]["minimum"]), 2))
            for city, summary in summaries.items()
            if fuel in summary
        ]
        if len(city_values) >= 3 and len({value for _, value in city_values}) == 1:
            print(
                f"Minimum-price comparison note: {fuel} has the same rounded minimum "
                f"in {len(city_values)} major cities: {city_values[0][1]:.2f}"
            )

    visuals.enrich_article(date_str, by_day)


if __name__ == "__main__":
    main()
