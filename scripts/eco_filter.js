let initFilters = () => {

    let filterGroups = document.querySelectorAll("[data-filter-group]");

    filterGroups.forEach(group => {

        let buttons = group.querySelectorAll(".filter-btn");
        let targetSelector = group.dataset.target;
        let items = document.querySelectorAll(targetSelector);

        buttons.forEach(btn => {
            btn.addEventListener("click", () => {

                let filter = btn.dataset.filter;

                // active state
                buttons.forEach(b => b.classList.remove("is-active"));
                btn.classList.add("is-active");

                items.forEach(item => {

                    let categories = item.dataset.cat || "";

                    let list = categories.split(",");

                    if (filter === "all" || list.includes(filter)) {
                        item.style.display = "";
                    } else {
                        item.style.display = "none";
                    }

                });

            });
        });

    });

};

document.addEventListener("DOMContentLoaded", initFilters);