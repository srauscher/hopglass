define(function () {
  return function (config) {
    var self = this
    var sel = document.createElement("select")
    sel.id = "siteChange"

    self.setData = function () {
      var siteNames = config.siteNames
      if(siteNames.length > 1){

        var allNodesOpt = document.createElement("option")
        allNodesOpt.innerHTML = config.allCommunities.name
        allNodesOpt.value = config.allCommunities.url
        if(window.location.pathname === config.allCommunities.url)
         allNodesOpt.selected = true

        sel.appendChild(allNodesOpt)

        siteNames.forEach(function(sites) {
          if(typeof sites.url !== "undefined") {
            var opt = document.createElement("option")
            opt.innerHTML = sites.name
            opt.value = sites.url
            if(window.location.pathname === sites.url)
              opt.selected = true

            sel.appendChild(opt)
          }
        })

      }

    }

    self.render = function (el) {
      var siteNames = config.siteNames

      var divParent = document.createElement("div")


      if(siteNames.length > 1) {
        var div = document.createElement("div")
        div.id = "siteChanger"
        div.classList.add("sites")
        el.appendChild(div)

        var label = document.createElement("label")
        label.htmlFor = "siteChange"
        div.appendChild(label)

        var yourCommunity = document.createTextNode("Deine Community: ")
        label.appendChild(yourCommunity)

        div.appendChild(sel)

        sel.onchange = function() {
          var x = document.getElementById("siteChange").value
//          config.dataPath = [x]
//          config.dataPathUpdated = true
          window.location = x
        }
      }

      el.appendChild(divParent)

      var p = document.createElement("p")
      var a = document.createElement("a")
      a.href = "https://www.knotenliste.de/index.html"
      a.text = "Knotenliste"
      a.target = "_blank"

      p.appendChild(a)
      divParent.appendChild(p)
    }

    return self
  }

})
