// ==UserScript==
// @name           PlayQuake Team Information
// @namespace      playquake.com
// @version        1.1-dev
// @license        GPL version 3 or any later version; http://www.gnu.org/copyleft/gpl.html
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
	var request;
	try {
		request = JSON.parse(event.data);		
	} catch (e) {
		return;
	}

	// only live request allowed here
	if (!(request.type) || request.type != "PQ:liveDataRequest") {
		return;
	}
	
	GM_xmlhttpRequest({
		method: 'GET',
		url : 'http://api.ctfpickup.eu:23007/channel/ctfpickup/live',
		timeout: 500,
		onload: function(data) {
			if (document.getElementById("ql_pickup_added_player") == null) {
				document.getElementById("ql_pickup_cnt").innerHTML = PQT.liveHtml;
				document.getElementById("ql_pickup_cnt").style.height = "130px";
				document.getElementById("ql_pickup_cnt").style.textAlign = "left";
			}
			
			try {
				var response = JSON.parse(data.responseText);
				if (response.ECODE < 0) {
					GM_log(response.MSG);
					return;
				}
				document.getElementById("ql_pickup_added_player").innerHTML = response.ADDED_PLAYERS + " / " + response.PLAYERS_TO_START;
				var $sv = document.getElementById("ql_pickup_game_sv");
				if (response.GAME_SERVER == null) {
					$sv.innerHTML = "No Server added yet.";
				} else {
					$sv.innerHTML = "<a href='" + response.GAME_SERVER.SV_LINK + "'>Join Server</a>";
				}
				document.getElementById("ql_pickup_lastgame").innerHTML = response.LAST_GAME + " ago";
				
			} catch (e) {
                GM_log("Couldn't parse requested data: " + e);
                return;
			}
			setTimeout(function() {
						var msg = {
								"type" : "PQ:liveDataRequest"
						};
						window.postMessage(JSON.stringify(msg), "*");
					}, 
					1000
			);
		},
		onerror: function(XMLHttpRequest, textStatus, error) {
			document.getElementById("ql_pickup_cnt").innerHTML = "<p style='margin: 3px 0 0 0; font-size: 12px;'><b>Service not available at the moment.</b></p>";
			document.getElementById("ql_pickup_cnt").style.height = "20px";
			document.getElementById("ql_pickup_cnt").style.textAlign = "center";
			setTimeout(function() {
						var msg = {
								"type" : "PQ:liveDataRequest"
						};
						window.postMessage(JSON.stringify(msg), "*");
						},
					10000
			);
		}
	});
}
window.addEventListener("message", pollLiveData, false);

/*
 * This will handle the team-request-event send by /teams within QL
 */
function handleRequest(event) {
	var request;
	try {
		request = JSON.parse(event.data);
	} catch (e) {
		return;
	}

	if (!(request.type)) {
		return;
	}

    if ("PQ:teamRequest" == request.type 
    	|| "PQ:mpRequest" == request.type
    	|| "PQ:missRequest" == request.type) {
        GM_xmlhttpRequest({
            method : 'GET',
            url : 'http://api.ctfpickup.eu:23007/channel/ctfpickup/teams/' + request.serverID,
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
                    GM_log("Couldn't parse requested data: " + e);
                    return;
                }
                window.postMessage(JSON.stringify(response), "*");
            }
        });
    }
    
    if ("PQ:playerDataRequest" == request.type) {
        GM_xmlhttpRequest({
            method : 'GET',
            url : 'http://api.ctfpickup.eu:23007/channel/ctfpickup/player/' + request.username,
            headers : {
                "Content-Type" : "application/x-www-form-urlencoded"
            },
            onload : function(data) {
                try {
                    var response = JSON.parse(data.responseText);
                    response.type = "PQ:playerDataResponse";
                } catch (e) {
                    GM_log("Couldn't parse requested data: " + e);
                    return;
                }
                window.postMessage(JSON.stringify(response), "*");
            }
        });
    }
}
window.addEventListener("message", handleRequest, false);

/*
 * Hopefully we'll get a response to our request, this function takes care of it
 */
contentEval(function() {
	PQT = {
		liveHtml : "" +
			"<img width='300' height='24' src='http://bot.xurv.org/banner_LivePickupInfo.png' /><br />" +
			"<div id='ql_pickup_cnt'>" +
			" <div id='ql_pickup_channel'>" +
			"  <a href='irc://irc.quakenet.org/#ctfpickup'><b>#ctfpickup</b></a><br />" +
			"  <p><b>Last Game:</b> <span id='ql_pickup_lastgame'></span></p>" +
			"  <p><b>Added Players:</b> <span id='ql_pickup_added_player'></span></p>" +
			"  <p><b>Server Link:</b> <span id='ql_pickup_game_sv'></span></p>" +
			" </div>" +
			" <div id='ql_pickup_player_stat'>" +
			"  <br /><b>Player Stats</b><br />" +		
			"  <table><tr><td><b>Rating:</b> <span id='ql_pickup_player_rating'></span></td>" +
			"  <td><b>WinRatio:</b> <span id='ql_pickup_player_winratio'></span></td></tr>" +
			"  <tr><td><b>AvgScore:</b> <span id='ql_pickup_player_score'></span></td>" +
			"  <td><b>* / 30 / 7:</b> <span id='ql_pickup_player_played'></span></td></tr>" +
			"  </table>" +
			" </div>" +
			"</div>" +
			"",
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
				GM_log("Couldn't parse event data: " + e);				
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
								
						var p_players = response.TEAM_RED.concat(response.TEAM_BLUE);
						var missing_players = "^3Missing:^7 ";
						var c = 0;
						for (i in p_players) {
							var found = false;
							for (j in sv.players) {
								if (p_players[i].QL_NICK.toLowerCase() == sv.players[j].name.toLowerCase()) {
									found = true;
									break;
								} 
							}
							if (!found) {
								c++;
								missing_players += p_players[i].QL_NICK + " ";
							}
						}
						if (c == 0) {
							missing_players += "No one is missing. Pickup is ready to start.";
						}
						qz_instance.SendGameCommand('say ' + missing_players + ';');
						return;
					}
				});
			}
			
            if ("PQ:mpResponse" == response.type) {
                try {
                    var mapPicker = response.MAP_PICKER.QL_NICK;
                } catch (e) {
                    GM_log("Couldn't parse the teams: " + e);
                    return;
                }
                qz_instance.SendGameCommand('say ^3Mappicker:^7 ' + mapPicker + ';');
                return;
            }
            
            if ("PQ:teamResponse" == response.type) {
                try {
                    var teamR = response.TEAM_RED;
                    var teamB = response.TEAM_BLUE;
                    var mapPicker = response.MAP_PICKER.QL_NICK;
                } catch (e) {
                    GM_log("Couldn't parse the teams: " + e);
                    return;
                }

                var teamRString = "^1Red:^7 ";
                var teamBString = "^4Blue:^7 ";
                var tmp;
                for (i in teamR) {
                    tmp = teamR[i].QL_NICK;
                    if (teamR[i].QL_NICK == mapPicker) {
                        tmp = "^3" + teamR[i].QL_NICK + "^7";
                    }
                    teamRString += tmp + " ";				
                }			
                for (i in teamB) {
                    tmp = teamB[i].QL_NICK;
                    if (teamB[i].QL_NICK == mapPicker) {
                        tmp = "^3" + teamB[i].QL_NICK + "^7";
                    }
                    teamBString += tmp + " ";
                }
                qz_instance.SendGameCommand('say ' + teamRString + ';');
                setTimeout(function(){
                    qz_instance.SendGameCommand('say ' + teamBString + ';');
                }, 700);
                return;
            }
            
            if ("PQ:playerDataResponse" == response.type) {
            	if (response.ECODE < 0) {
            		$("#ql_pickup_player_stat").html("You may have not yet played a game in that channel." +
            			"<br />No data available.");
            		return;
            	}
            	$("#ql_pickup_player_rating").html(response.RATING);
            	$("#ql_pickup_player_winratio").html(response.WIN_RATIO);
            	$("#ql_pickup_player_score").html(response.AVG_SCORE);
            	$("#ql_pickup_player_played").html(response.PLAYED_OVERALL + " / " +
            									   response.PLAYED_LAST_30_DAYS + " / " +
            									   response.PLAYED_LAST_7_DAYS + " / ");
            }
		}
	};
	window.addEventListener("message", PQT.handleResponse, false);
});

GM_addStyle(	
		"" +
		"#ql_pickup_cnt {" +
		"    width: 298px;" +
		"    height: 130px;" +
		"    text-align: left;" +
		"    color: #000;" +
		"    margin: 0 0 10px 0;" +
		"    font-size: 11px;" +
		"    font-weight: normal;" +
		"	 background: #e7e7e7;" +
		"    border: 1px solid rgb(57, 57, 57);" +
		"}" +
		"#ql_pickup_cnt div {" +
		"    margin: 0 0 0 9px;" +
		"}" +
		"#ql_pickup_cnt p {" +
		"    width: 290px;" +
		"    color: #000;" +
		"    margin: 0 0 0 27px;" +
		"    font-size: 11px;" +
		"    font-weight: normal;" +
		"}" +
		"#ql_pickup_cnt table {" +
		"    margin: 2px 0 0 18px;" +
		"}" +
		"#ql_pickup_cnt td {" +
		"    color: #000;" +
		"    padding: 0 0 0 9px;" +
		"    font-size: 11px;" +
		"    font-weight: normal;" +
		"}" +
		"#ql_pickup_cnt a {" +
		"    color: #DB3213;" +
		"    font-size: 12px;" +
		"    font-weight: normal;" +
		"    line-height: 20px;" +
		"    margin-right: 5px;" +
		"    text-decoration: none;" +
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
		$tb.before(PQT.liveHtml);
				
		// once we've added our section, poll for pickup data
		var msg = {
			"type" : "PQ:liveDataRequest"
		};
		window.postMessage(JSON.stringify(msg), "*");
		
		msg = {
			"type" : "PQ:playerDataRequest",
			"username" : quakelive.username
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
