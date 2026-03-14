document.addEventListener("DOMContentLoaded", function(){

    let container = document.getElementById("fuelo-widget-container")

    if(container && typeof FueloWidget !== "undefined"){

        new FueloWidget({
            container:"fuelo-widget-container",
            language:"bg"
        })

    }

})