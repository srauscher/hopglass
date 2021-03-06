define(["sorttable", "virtual-dom", "numeral"], function (SortTable, V, numeral) {
  function getUptime(now, d) {
    if (d.flags.online && "uptime" in d.statistics)
      return Math.round(d.statistics.uptime)
    else if (!d.flags.online && "lastseen" in d)
      return Math.round(-(now.unix() - d.lastseen.unix()))
  }

  function showUptime(uptime) {
    var s = ""
    uptime /= 3600

    if (uptime !== undefined)
      if (Math.abs(uptime) >= 24)
        s = Math.round(uptime / 24) + "d"
      else
        s = Math.round(uptime) + "h"

    return s
  }

  var headings = [{ name: "Knoten",
                    sort: function (a, b) {
                      var aname = typeof a.nodeinfo.hostname === "string" ? a.nodeinfo.hostname : a.nodeinfo.node_id
                      var bname = typeof b.nodeinfo.hostname === "string" ? b.nodeinfo.hostname : b.nodeinfo.node_id
                      if (typeof aname === "string" && typeof bname === "string")
                        return aname.localeCompare(bname)
                      return typeof aname === "string" ? 1 : typeof bname === "string" ? -1 : 0
                    },
                    reverse: false
                  },
                  { name: "Uptime",
                    sort: function (a, b) {
                      return a.uptime - b.uptime
                    },
                    reverse: true
                  },
                  { name: "#Links",
                    sort: function (a, b) {
                      return a.meshlinks - b.meshlinks
                    },
                    reverse: true
                  },
                  { name: "Clients",
                    sort: function (a, b) {
                      return ("clients" in a.statistics ? a.statistics.clients : -1) -
                             ("clients" in b.statistics ? b.statistics.clients : -1)
                    },
                    reverse: true
                  },
                  { name: "Load",
                    sort: function (a, b) {
                      return ("loadavg" in a.statistics ? a.statistics.loadavg : -1) -
                             ("loadavg" in b.statistics ? b.statistics.loadavg : -1)
                    },
                    reverse: true
}]

  return function(router) {
    function renderRow(d) {
      var td1Content = []
      var aClass = ["hostname", d.flags.online ? "online" : "offline"]

      td1Content.push(V.h("a", { className: aClass.join(" "),
                                 onclick: router.node(d),
                                 href: "#!n:" + d.nodeinfo.node_id
                               }, d.nodeinfo.hostname))

      if (has_location(d))
        td1Content.push(V.h("span", {className: "icon ion-location"}))

      var td1 = V.h("td", td1Content)
      var td2 = V.h("td", showUptime(d.uptime))
      var td3 = V.h("td", d.meshlinks.toString())
      var td4 = V.h("td", numeral("clients" in d.statistics ? d.statistics.clients : "").format("0,0"))
      var td5 = V.h("td", numeral("loadavg" in d.statistics ? d.statistics.loadavg : "").format("0,0.00"))

      return V.h("tr", [td1, td2, td3, td4, td5])
    }

    var table = new SortTable(headings, 0, renderRow)

    this.render = function (d) {
      var el = document.createElement("div")
      d.appendChild(el)

      var h2 = document.createElement("h2")
      h2.textContent = "Alle Knoten"
      el.appendChild(h2)

      el.appendChild(table.el)
    }

    this.setData = function (d) {
      var data = d.nodes.all.map(function (e) {
        var n = Object.create(e)
        n.uptime = getUptime(d.now, e) || 0
        n.meshlinks = e.meshlinks || 0
        return n
      })

      table.setData(data)
    }
  }
})
