define(['sorttable', 'snabbdom', 'moment', 'helper'],
  function (SortTable, V, moment, helper) {
    'use strict';
    V = V.default;

    function showGeoURI(d) {
      if (!helper.hasLocation(d)) {
        return undefined;
      }

      return function (el) {
        var a = document.createElement('a');
        a.textContent = Number(d.nodeinfo.location.latitude.toFixed(6)) + ', ' + Number(d.nodeinfo.location.longitude.toFixed(6));
        a.href = 'geo:' + d.nodeinfo.location.latitude + ',' + d.nodeinfo.location.longitude;
        el.appendChild(a);
      };
    }

    function showStatus(d) {
      return function (el) {
        el.classList.add(d.flags.unseen ? 'unseen' : (d.flags.online ? 'online' : 'offline'));
        if (!d.firstseen || !d.lastseen) {
          el.textContent = _.t('node.neverSeen');
        } else {
          el.textContent = _.t((d.flags.online ? 'node.lastOnline' : 'node.lastOffline'), {
            time: d.lastseen.fromNow(),
            date: d.lastseen.format('DD.MM.YYYY, H:mm:ss')
          });
        }
      };
    }

    function showFirmware(d) {
      return [
        helper.dictGet(d.nodeinfo, ['software', 'firmware', 'release']),
        helper.dictGet(d.nodeinfo, ['software', 'firmware', 'base'])
      ].filter(function (n) {
        return n !== null;
      }).join(' / ') || undefined;
    }

    function showSite(d, config) {
      var site = helper.dictGet(d.nodeinfo, ['system', 'site_code']);
      var rt = site;
      if (config.siteNames) {
        config.siteNames.forEach(function (t) {
          if (site === t.site) {
            rt = t.name;
          }
        });
      }
      return rt || undefined;
    }

    function showUptime(d) {
      if (!('uptime' in d.statistics)) {
        return undefined;
      }

      return moment.duration(d.statistics.uptime, 'seconds').humanize();
    }

    function showFirstseen(d) {
      if (!('firstseen' in d)) {
        return undefined;
      }

      return d.firstseen.fromNow(true);
    }

    function getMeshClients(node) {
      var meshclients = 0;
      if (node.statistics && !isNaN(node.statistics.clients)) {
        meshclients = node.statistics.clients;
      }

      if (!node) {
        return 0;
      }

      if (node.parsed) {
        return 0;
      }

      node.parsed = 1;
      node.neighbours.forEach(function (neighbour) {
        if (!neighbour.link.vpn && neighbour.node) {
          meshclients += getMeshClients(neighbour.node);
        }
      });

      return meshclients;
    }

    function resetMeshClients(node) {
      if (!node.parsed) {
        return;
      }

      node.parsed = 0;

      node.neighbours.forEach(function (neighbour) {
        if (!neighbour.link.isVPN && neighbour.node) {
          resetMeshClients(neighbour.node);
        }
      });

      return;
    }

    function showClients(d) {
      if (!d.flags.online) {
        return undefined;
      }

      var meshclients = getMeshClients(d);
      resetMeshClients(d);
      var before = ' (';
      var after = _.t('node.meshClients') + ')';

      return function (a) {
        a.appendChild(document.createTextNode(d.statistics.clients > 0 ? d.statistics.clients : _.t('none')));
        a.appendChild(document.createTextNode(before));
        a.appendChild(document.createTextNode(meshclients > 0 ? meshclients : _.t('none')));
        a.appendChild(document.createTextNode(after));
        a.appendChild(document.createElement('br'));

        var span = document.createElement('span');
        span.classList.add('clients');
        span.innerHTML = '<i class="ion-person"></i>'.repeat(d.statistics.clients);
        a.appendChild(span);

        var spanmesh = document.createElement('span');
        spanmesh.classList.add('mesh-clients');
        spanmesh.innerHTML = '<i class="ion-person"></i>'.repeat(meshclients - d.statistics.clients);
        a.appendChild(spanmesh);
      };
    }

    function showIPs(d) {
      var ips = helper.dictGet(d.nodeinfo, ['network', 'addresses']);
      if (ips === null) {
        return undefined;
      }

      ips.sort();

      return function (el) {
        ips.forEach(function (ip, i) {
          var link = !ip.startsWith('fe80:');

          if (i > 0) {
            el.appendChild(document.createElement('br'));
          }

          if (link) {
            var a = document.createElement('a');
            a.href = 'http://[' + ip + ']/';
            a.textContent = ip;
            el.appendChild(a);
          } else {
            el.appendChild(document.createTextNode(ip));
          }
        });
      };
    }

    function showBar(v, width, warning) {
      var span = document.createElement('span');
      span.classList.add('bar');

      var bar = document.createElement('span');
      bar.style.width = (width * 100) + '%';
      if (warning) {
        span.classList.add('warning');
      }
      span.appendChild(bar);

      var label = document.createElement('label');
      label.textContent = v;
      span.appendChild(label);

      return span;
    }

    function showLoad(d) {
      if (!('loadavg' in d.statistics)) {
        return undefined;
      }

      return function (el) {
        var value = d.statistics.loadavg.toFixed(2);
        var width = d.statistics.loadavg % 1;
        var warning = false;
        if (d.statistics.loadavg >= d.nodeinfo.hardware.nproc) {
          warning = true;
        }
        el.appendChild(showBar(value, width, warning));
      };
    }

    function showRAM(d) {
      if (!('memory_usage' in d.statistics)) {
        return undefined;
      }

      return function (el) {
        var value = Math.round(d.statistics.memory_usage * 100) + ' %';
        var width = d.statistics.memory_usage;
        var warning = false;
        if (d.statistics.memory_usage >= 0.8) {
          warning = true;
        }
        el.appendChild(showBar(value, width, warning));
      };
    }

    function showAutoupdate(d) {
      var au = helper.dictGet(d.nodeinfo, ['software', 'autoupdater']);
      if (!au) {
        return undefined;
      }

      return au.enabled ? _.t('node.activated', { branch: au.branch }) : _.t('node.deactivated');
    }

    function showStatImg(o, d) {
      var subst = {};
      subst['{NODE_ID}'] = d.nodeinfo.node_id;
      subst['{NODE_NAME}'] = d.nodeinfo.hostname.replace(/[^a-z0-9\-]/ig, '_');
      if (d.lastseen) {
        subst['{TIME}'] = d.lastseen.format('DDMMYYYYHmmss');
      }
      subst['{LOCALE}'] = _.locale();
      return helper.showStat(o, subst);
    }

    return function (config, el, router, d, gateways) {
      function renderNeighbourRow(n) {
        var icons = [];
        icons.push(V.h('span', { props: { className: n.incoming ? 'ion-arrow-left-c' : 'ion-arrow-right-c' } }));
        if (helper.hasLocation(n.node)) {
          icons.push(V.h('span', { props: { className: 'ion-location' } }));
        }

        var name = V.h('a', {
          props: {
            className: 'online',
            href: router.generateLink({ node: n.node.nodeinfo.node_id })
          }, on: {
            click: function (e) {
              router.fullUrl({ node: n.node.nodeinfo.node_id }, e);
            }
          }
        }, n.node.nodeinfo.hostname);

        var td4Content = V.h('a', {
          props: {
            title: 'link type: ' + n.link.type,
            href: router.generateLink({ link: n.link.id })
          },
          style: {
            color: helper.linkColor(n.link)
          }
        }, helper.showTq(n.link));

        var td1 = V.h('td', icons);
        var td2 = V.h('td', name);
        var td3 = V.h('td', (n.node.statistics.clients ? n.node.statistics.clients.toString() : '0'));
        var td4 = V.h('td', td4Content);
        var td5 = V.h('td', helper.showDistance(n.link));

        return V.h('tr', [td1, td2, td3, td4, td5]);
      }

      function createLink(target) {
        if (!target) {
          return document.createTextNode('unknown');
        }
        var unknown = !(target.node);
        var text = unknown ? (target.id ? target.id : target) : target.node.nodeinfo.hostname;
        if (!unknown) {
          var link = document.createElement('a');
          link.classList.add('hostname-link');
          link.href = router.generateLink({ node: target.node.nodeinfo.node_id });
          link.textContent = text;
          return link;
        }
        return document.createTextNode(text);
      }

      function showGateway(n) {
        var nh;
        if (helper.dictGet(n.statistics, ['nexthop'])) {
          nh = helper.dictGet(n.statistics, ['nexthop']);
        }
        if (helper.dictGet(n.statistics, ['gateway_nexthop'])) {
          nh = helper.dictGet(n.statistics, ['gateway_nexthop']);
        }
        var gw = helper.dictGet(n.statistics, ['gateway']);
        gw = helper.resolveGateway(gw, gateways) || gw;
        return function (a) {
          var num = 0;
          while (gw && nh && gw.id !== nh.id && num < 10) {
            if (num !== 0) a.appendChild(document.createTextNode(' -> '));
            a.appendChild(createLink(nh, router));
            num++;
            if (!nh.node || !nh.node.statistics) {
              break;
            }
            if (!helper.dictGet(nh.node.statistics, ['gateway']) || !helper.dictGet(nh.node.statistics, ['gateway']).id) {
              break;
            }
            if (helper.dictGet(nh.node.statistics, ['gateway']).id !== gw.id) {
              break;
            }
            if (helper.dictGet(nh.node.statistics, ['gateway_nexthop'])) {
              nh = helper.dictGet(nh.node.statistics, ['gateway_nexthop']);
            } else if (helper.dictGet(nh.node.statistics, ['nexthop'])) {
              nh = helper.dictGet(nh.node.statistics, ['nexthop']);
            } else {
              break;
            }
          }
          if (gw && nh && gw.id !== nh.id) {
            if (num !== 0) {
              a.appendChild(document.createTextNode(' -> '));
            }
            num++;
            a.appendChild(document.createTextNode('...'));
          }
          if (num !== 0) {
            a.appendChild(document.createTextNode(' -> '));
          }
          a.appendChild(createLink(gw, router));
          return a;
        };
      }

      var h2 = document.createElement('h2');
      h2.textContent = d.nodeinfo.hostname;
      el.appendChild(h2);

      var attributes = document.createElement('table');
      attributes.classList.add('attributes');

      helper.attributeEntry(attributes, 'node.status', showStatus(d));
      helper.attributeEntry(attributes, 'node.gateway', d.flags.gateway ? 'ja' : null);
      helper.attributeEntry(attributes, 'node.coordinates', showGeoURI(d));

      if (config.nodeInfobox && config.nodeInfobox.contact) {
        helper.attributeEntry(attributes, 'node.contact', helper.dictGet(d.nodeinfo, ['owner', 'contact']));
      }

      helper.attributeEntry(attributes, 'node.hardware', helper.dictGet(d.nodeinfo, ['hardware', 'model']));
      helper.attributeEntry(attributes, 'node.primaryMac', helper.dictGet(d.nodeinfo, ['network', 'mac']));
      helper.attributeEntry(attributes, 'node.id', helper.dictGet(d.nodeinfo, ['node_id']));
      helper.attributeEntry(attributes, 'node.firmware', showFirmware(d));
      helper.attributeEntry(attributes, 'node.site', showSite(d, config));
      helper.attributeEntry(attributes, 'node.uptime', showUptime(d));
      helper.attributeEntry(attributes, 'node.firstSeen', showFirstseen(d));
      if (config.nodeInfobox && config.nodeInfobox.hardwareUsage) {
        helper.attributeEntry(attributes, 'node.systemLoad', showLoad(d));
        helper.attributeEntry(attributes, 'node.ram', showRAM(d));
      }
      helper.attributeEntry(attributes, 'node.ipAddresses', showIPs(d));
      helper.attributeEntry(attributes, 'node.selectedGateway', showGateway(d, gateways));
      helper.attributeEntry(attributes, 'node.update', showAutoupdate(d));
      helper.attributeEntry(attributes, 'node.clients', showClients(d));

      el.appendChild(attributes);

      if (d.neighbours.length > 0) {
        var h3 = document.createElement('h3');
        h3.textContent = _.t('node.link', d.neighbours.length) + ' (' + d.neighbours.length + ')';
        el.appendChild(h3);

        var headings = [{
          name: ''
        }, {
          name: 'node.nodes',
          sort: function (a, b) {
            return a.node.nodeinfo.hostname.localeCompare(b.node.nodeinfo.hostname);
          },
          reverse: false
        }, {
          name: 'node.clients',
          class: 'ion-people',
          sort: function (a, b) {
            return ('clients' in a.node.statistics ? a.node.statistics.clients : -1) -
              ('clients' in b.node.statistics ? b.node.statistics.clients : -1);
          },
          reverse: true
        }, {
          name: 'node.tq',
          class: 'ion-connection-bars',
          sort: function (a, b) {
            return a.link.tq - b.link.tq;
          },
          reverse: true
        }, {
          name: 'node.distance',
          class: 'ion-arrow-resize',
          sort: function (a, b) {
            return (a.link.distance === undefined ? -1 : a.link.distance) -
              (b.link.distance === undefined ? -1 : b.link.distance);
          },
          reverse: true
        }];

        var table = new SortTable(headings, 1, renderNeighbourRow);
        table.setData(d.neighbours);
        table.el.elm.classList.add('node-links');
        el.appendChild(table.el.elm);
      }

      if (config.nodeInfos) {
        config.nodeInfos.forEach(function (nodeInfo) {
          var h4 = document.createElement('h4');
          h4.textContent = nodeInfo.name;
          el.appendChild(h4);
          el.appendChild(showStatImg(nodeInfo, d));
        });
      }
    };
  });
