define([], function () {
  return function () {
    var refreshFunctions = []
    var timer
    var input = document.createElement("input")

    function refresh() {
      clearTimeout(timer)
      timer = setTimeout(function () {
        refreshFunctions.forEach(function (f) {
          f()
        })
      }, 250)
    }

    var value = document.createElement("strong")
    value.classList.add("input")

    updateValue()

    function updateValue() {
      value.textContent = input.value
    }

    function run(d) {

      if (d.nodeinfo === undefined || d.nodeinfo.hostname === null)
        return 0

      if (d.nodeinfo)
        return d.nodeinfo.hostname.toLowerCase().includes(input.value.toLowerCase())
    }

    function setRefresh(f) {
      refreshFunctions.push(f)
    }

    function render(el) {
      input.type = "search"
      input.placeholder = "Knotenname"
      input.setAttribute("aria-label", "Knotenname")
      input.addEventListener("input", refresh)
      el.classList.add("filter-node")
      el.classList.add("ion-wifi")
      el.appendChild(input)
    }

    return {
      run: run,
      setRefresh: setRefresh,
      render: render
    }
  }
})
