// ==UserScript==
// @name           PlayQuake Team Information
// @namespace      playquake.com
// @version        1.1-dev
// @description    Get the latest teams for a certain Quakelive server used in a pickup-game
// @author         smove
// @include        http://*.quakelive.com/*
// @exclude        http://*.quakelive.com/forum/*
// @run-at         document-end
// ==/UserScript==


// Taken from: http://wiki.greasespot.net/Content_Script_Injection
function contentEval(source) {
	// Check for function input.
	if ("function" == typeof (source)) {
	    // Execute this function with no arguments, by adding parentheses.
	    // One set around the function, required for valid syntax, and a
	    // second empty set calls the surrounded function.
		source = "(" + source + ")();";
	}

	// Create a script node holding this source code.
	var script = document.createElement("script");
	script.setAttribute("type", "application/javascript");
	script.textContent = source;

	// Insert the script node into the page, so it will run, and immediately
	// remove it to clean up.
	document.body.appendChild(script);
	document.body.removeChild(script);
}

function pollLiveData(event) {

	setTimeout(function() {
		GM_xmlhttpRequest({
			method: 'GET',
			url : 'http://bot.xurv.org/teams.dev.php?id=',
			
		});
	}, 500);
}
/*
 * This will handle the team-request-event send by /teams within QL
 */
function handleTeamRequest(event) {
	var request;
	try {
		request = JSON.parse(event.data);
	} catch (e) {
		return;
	}

	// only team-request allowed here
	if (!(request.type)) {
		return;
	}

    if ("PQ:teamRequest" == request.type 
    	|| "PQ:mpRequest" == request.type
    	|| "PQ:missRequest" == request.type) {
        GM_xmlhttpRequest({
            method : 'GET',
            url : 'http://bot.xurv.org/teams.dev.php?id=' + request.serverID,
            headers : {
                "Content-Type" : "application/x-www-form-urlencoded"
            },
            onload : function(data) {
                try {
                    var response = JSON.parse(data.responseText);
                    if ("PQ:teamRequest" == request.type) {
                        response.type = "PQ:teamResponse";
                    }
                    if ("PQ:mpRequest" == request.type) {
                        response.type = "PQ:mpResponse";
                    }
                    if ("PQ:missRequest" == request.type) {
                        response.type = "PQ:missResponse";
                    }
                } catch (e) {
                    console.log("Couldn't parse requested data: " + e);
                    return;
                }
                window.postMessage(JSON.stringify(response), "*");
            }
        });
    }
}
window.addEventListener("message", handleTeamRequest, false);

/*
 * Hopefully we'll get a response to our request, this function takes care of it
 */
contentEval(function() {
	PQT = {
/*		 isStandardUser : function(player) {
			GM_xmlhttpRequest({
					synchronous : true,
					method : 'GET',
					url : '/profile/summary/' + player,
					success : function(data) {
						var pattern = new RegExp("premium_status_0", 'g');
						return pattern.test(data);
					}	
				});
		},*/
		handleResponse : function(event) {
			var response;
			try {
				response = JSON.parse(event.data);
			} catch (e) {
				console.log("Couldn't parse event data: " + e);				
				return;
			}

			// only response messages allowed here
			if (!(response.type)) {
				return;
			}
		
			if (response.ECODE < 0) {
				qz_instance.SendGameCommand("echo Can't find any data for this server.;");
				return;
			}

			if ("PQ:missResponse" == response.type) {
				quakelive.serverManager.RefreshServerDetails(quakelive.currentServerId, {
					onSuccess: function () {
						var sv = quakelive.serverManager.GetServerInfo(quakelive.currentServerId);
						
						if (sv.players.length == 0) {
							qz_instance.SendGameCommand('echo Could not retrieve any players from this server yet. Try again in a few seconds.;');
							return;
						}
								
						var p_players = response.teamRed.concat(response.teamBlue);
						var missing_players = "^3Missing:^7 ";
						var c = 0;
						for (i in p_players) {
//							console.log(p_players[i] + " needs an invite? " + PQT.isStandardUser(p_players[i]));
							var found = false;
							for (j in sv.players) {
								if (p_players[i] == sv.players[j].name) {
									found = true;
									break;
								} 
							}
							if (!found) {
								c++;
								missing_players += p_players[i] + " ";
							}
						}
						if (!c) {
							missing_players += "No one is missing. Pickup is ready to start.";
						}
						qz_instance.SendGameCommand('say ' + missing_players + ';');
						return;
					}
				});
			}
			
            if ("PQ:mpResponse" == response.type) {
                try {
                    var mapPicker = response.mapPicker;
                } catch (e) {
                    console.log("Couldn't parse the teams: " + e);
                    return;
                }
                qz_instance.SendGameCommand('say ^3Mappicker:^7 ' + mapPicker + ';');
                return;
            }
            
            if ("PQ:teamResponse" == response.type) {
                try {
                    var teamR = response.teamRed;
                    var teamB = response.teamBlue;
                    var mapPicker = response.mapPicker;
                } catch (e) {
                    console.log("Couldn't parse the teams: " + e);
                    return;
                }

                var teamRString = "^1Red:^7 ";
                var teamBString = "^4Blue:^7 ";
                var tmp;
                for (i in teamR) {
                    tmp = teamR[i];
                    if (teamR[i] == mapPicker) {
                        tmp = "^3" + teamR[i] + "^7";
                    }
                    teamRString += tmp + " ";				
                }			
                for (i in teamB) {
                    tmp = teamB[i];
                    if (teamB[i] == mapPicker) {
                        tmp = "^3" + teamB[i] + "^7";
                    }
                    teamBString += tmp + " ";
                }
                qz_instance.SendGameCommand('say ' + teamRString + ';');
                setTimeout(function(){
                    qz_instance.SendGameCommand('say ' + teamBString + ';');
                }, 700);
                return;
            }
		}
	};
	window.addEventListener("message", PQT.handleResponse, false);
});

GM_addStyle(
	"#ql_pickup_info {" +
	"    width: 298px;" +
	"    height: 75px;" +
	"    text-align: left;" +
	"    padding: 0;" +
	"    margin: 0 0 10px 0;" +
	"    font-weight: bold;" +
	"	 background: #e7e7e7 url('http://cdn.quakelive.com/images/invites_title_v2013022600.0.png') no-repeat left top;" +
	"    border: 1px solid rgb(57, 57, 57);" +
	"}" +
	".ql_pickup_head {" +
	"    width: 290px;" +
	"    height: 30px;" +
	"    margin: 4px 0 0 9px;" +
	"    font-size: 18px;" +
	"    font-weight: bold;" +
	"}" +
	".ql_pickup_cnt span {" +
	"    width: 290px;" +
	"    color: #000;" +
	"    margin: 0 0 0 9px;" +
	"    font-size: 11px;" +
	"    font-weight: normal;" +
	"}"
);

contentEval(function() {
	var $ui, $tb, intStatusTop, tries = 200;
	intStatusTop = setInterval(function() {
		$ui = $("#post_spon_content");
		$tb = $ui.find("#my_server");
		
		if (--tries && !$tb.length) {
			return;
		}
		clearInterval(intStatusTop);
		intStatusTop = null;

		$tb.before("" +
				"<div id='ql_pickup_info'>" +
				"<div class='ql_pickup_head'>Pickup Live Info</div>" +
				"<div class='ql_pickup_cnt'>" +
				" <span>Players: 3/8</span><br />" +
				" <span>Server: Link</span>" +
				"</div>" +
				"</div>" +
				"");
		
		// once we've added our section, poll for pickup data
		var msg = {
			"type" : "PQ:liveDataRequest",
			"user" : quakelive.username
		};
		window.postMessage(JSON.stringify(msg), "*");
		
	}, 100);
});

/*
 * QL-Ingame-Commands and aliases are handled here
 */
contentEval(function() {
	if (typeof quakelive != 'object') {
		return;
	}
	var commands = {
		teams : {
			params : false,
			dft : 0,
			fn : function(val) {
				if (!quakelive.currentServerId) {
					qz_instance.SendGameCommand("echo Pickup with Bots? Good luck with that....;");
				} else {
					window.postMessage(JSON.stringify({
						"serverID" : quakelive.currentServerId,
						"type" : "PQ:teamRequest"
					}), "*");
				}
			}
		},
        mappicker : {
            params : false,
            dft : 0,
            fn : function(val) {
                if (!quakelive.currentServerId) {
                    qz_instance.SendGameCommand("echo Pickup with Bots? Good luck with that...;");
                } else {
                    window.postMessage(JSON.stringify({
                        "serverID" : quakelive.currentServerId,
                        "type" : "PQ:mpRequest"
                    }), "*");
                }
            }
        },
        missing : {
            params : false,
            dft : 0,
            fn : function(val) {
                if (!quakelive.currentServerId) {
                    qz_instance.SendGameCommand("echo Pickup with Bots? Good luck with that...;");
                } else {
                    window.postMessage(JSON.stringify({
                        "serverID" : quakelive.currentServerId,
                        "type" : "PQ:missRequest"
                    }), "*");
                }
            }
        }

	};
	var oldLaunchGame = LaunchGame, ready;
	LaunchGame = function(params, server) {
		ready = false;
		for (i in commands) {
			if (commands[i].params) {
				params.Append('+set ' + i + ' "^7"');
				params.Append('+set ' + i + ' "' + commands[i].dft + '"');
			} else {
				commands[i].dft = 0;
				params.Append('+set GM_qlpqc_' + i + ' "0"');
				params.Append('+alias ' + i + ' "set GM_qlpqc_' + i + ' 1"');
			}
		}
		return oldLaunchGame.apply(this, arguments);
	};
	var oldOnCommNotice = OnCommNotice;
	OnCommNotice = function(error, data) {
		if (error == 0) {
			var msg = quakelive.Eval(data);
			if (msg.MSG_TYPE == 'serverinfo') {
				ready = true;
			}
		}
		return oldOnCommNotice.apply(this, arguments);
	};
	var oldOnCvarChanged = OnCvarChanged;
	OnCvarChanged = function(name, value, replicate) {
		for (i in commands) {
			if ((commands[i].params && name == i)
					|| (!commands[i].params && name == 'GM_qlpqc_' + i)) {
				if (value != commands[i].dft) {
					if (ready) {
						commands[i].fn(value);
					}
					qz_instance.SendGameCommand('set ' + name + ' "'
							+ commands[i].dft + '";');
				}
				replicate = 0;
			}
		}
		return oldOnCvarChanged.apply(this, arguments);
	};
});
