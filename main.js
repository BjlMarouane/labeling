var user_id = "";
var current_commit = "";
var commits = [];
var activities = "";
var clusters = [];
var errors = [];
var their_labels = [];
var my_labels = [];
var to_download = []; //To remove later
var httpReq = new XMLHttpRequest(); 
var url = (document.URL.indexOf("https") == -1) ? "http://localhost:3000" : "https://protected-hamlet-78090.herokuapp.com";

$(".backButt").click(function () {
  current_commit = commits[parseInt($(".commitNum").html()) - 2]["commit_id"];
  load_commit();
});

//Login clic
$(".loginButt").click(function () {
  user_id = $(".login_view input").val();
  if (user_id) {
    check_isAdmin();
  } else {
    alert("Champ manquant: Username.");
  }
});

//Tangled
$(".tangButt").click(function () {
  $("._bjA").removeClass("d-none");
  $(".com-code").addClass("clustering");
  $("table tr, table td").removeClass("ui-selected")
});

//Atomique or Difficile à juger.
$(".skipButt, .atomButt").click(function () {
  $("._bjA").addClass("d-none");
  $(".com-code").removeClass("clustering");
  $(".clusters_popup").addClass("d-none");
});

//Clic sur Valider
$(".saveButt").click(function () {
  if (save_check()) {
      save_label();
    }
});

//Verification before the validation
function save_check() {
  var flag = true;
  errors = [];
  activities = "";

  if ($(".tangButt").hasClass("chosen")) { flag = clustering_check(); }
  if (!$(".buttons button").hasClass("chosen")) {
    flag = false;
    errors.push("Sélectioner une option: Atomique, Enchevêtré ou Difficile à juger.");
  }

  if ($("#CheckPerfectif").is(":checked")) {
    activities += "perfectif,";
  }
  if ($("#CheckCorrectif").is(":checked")) {
    activities += "correctif,";
  }
  if ($("#CheckAdaptif").is(":checked")) {
    activities += "adaptif";
  }
  if (activities.length == "") {
    flag = false;
    errors.push("Choisisser au moins un type: Perfectif, Adaptif ou Correctif.")
  }
  
  $(".modal.errors ul").html("");
  if (!flag) {
    for (var e of errors) {
      $(".modal.errors ul").append("<li>" + e + "</li>")
    }
    $(".modal.errors").modal("show");
  }
  return flag;
}

//Change cluster number
$(".change td:first-child").click(function () {
  var current = parseInt($(this).html());
  $(this).html((current == 4)? 1 : (current+1))
});

$(".buttons button").click(function () {
  $(".buttons button").removeClass("chosen");
  $(this).addClass("chosen");
});

function check_isAdmin() {
  fetch(url + "/is_admin/"+ user_id)
  .then((response) => response.json())
    .then((data) => {
      if (data["is_admin"]) {
        load_admin_page();
      } else {
        load_user_commits();
      }
  });
}

function load_admin_page() {
  $(".login_view").addClass("d-none");
  $(".admin_view").removeClass("d-none");
  
  fetch(url + "/stats/" + user_id + "/" + user_id)
    .then((response) => response.json())
    .then((data) => {
      const my_commits = data['data'];
      my_labels = my_commits.filter(commit => {
        return commit.type;
      });
      const percent = ((my_labels.length * 100) / my_commits.length).toFixed(1);
      $(".my-total").html(my_labels.length + " / " + my_commits.length);

      const labels = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; //[atomic, tangled, A, C, P, CA, PA, PC, PCA]
      for (const [index, c] of my_labels.entries()) {
        if (c["type"] == "atomic") {
          ++labels[0];
        } else if (c["type"] == "tangled") {
          ++labels[1];
        } else {
          ++labels[2];
        }
        switch(c["activities"]) {
          case "perfectif,correctif,adaptif":
            ++labels[9];
            break;
          case "perfectif,correctif,":
            ++labels[8];
            break;
          case "perfectif,adaptif":
            ++labels[7];
            break;
          case "correctif,adaptif":
            ++labels[6];
            break;
          case "perfectif,":
            ++labels[5];
            break;
          case "correctif,":
            ++labels[4];
            break;
          case "adaptif":
            ++labels[3];
            break;
          default:
        }
      }

      $(".my-atomic").html(labels[0] + " <span class='percent'>  (" + ((labels[0] * 100) / my_labels.length).toFixed(1) + " %) </span>");
      $(".my-tangled").html(labels[1] + " <span class='percent'>  (" + ((labels[1] * 100) / my_labels.length).toFixed(1) + " %) </span>");
      $(".my-difficult").html(labels[2] + " <span class='percent'>  (" + ((labels[2] * 100) / my_labels.length).toFixed(1) + " %) </span>");
      $(".my-adap").html(labels[3] + " <span class='percent'>  (" + ((labels[3] * 100) / my_labels.length).toFixed(1) + " %) </span>");
      $(".my-corr").html(labels[4] + " <span class='percent'>  (" + ((labels[4] * 100) / my_labels.length).toFixed(1) + " %) </span>");
      $(".my-perf").html(labels[5] + " <span class='percent'>  ("+ ((labels[5] * 100) / my_labels.length).toFixed(1) + " %) </span>");
      $(".my-adap-corr").html(labels[6] + " <span class='percent'>  (" + ((labels[6] * 100) / my_labels.length).toFixed(1) + " %) </span>");
      $(".my-perf-adap").html(labels[7] + " <span class='percent'>  (" + ((labels[7] * 100) / my_labels.length).toFixed(1) + " %) </span>");
      $(".my-corr-perf").html(labels[8] + " <span class='percent'>  (" + ((labels[8] * 100) / my_labels.length).toFixed(1) + " %) </span>");
      $(".my-corr-adap-perf").html(labels[9] + " <span class='percent'>  (" + ((labels[9] * 100) / my_labels.length).toFixed(1) + " %) </span>");

      show_conflits();
    });
}

function load_juges() {
  fetch(url + "/juges/?commit_id=" + current_commit)
  .then((response) => response.json())
  .then((data) => {
    const juges = data['data'];
    $(".juges").html("");
    for (const [index, juge] of juges.entries()) {
      if(juge['user_id'] != user_id){
        const juge_elem = "<div>" + juge["name"] + " : <span class='jugement'>" + juge["type"] + "  |  " + juge["activities"] + " </span></div>";
        $(".juges").append(juge_elem)
      }
    }
    console.log(juges);
  });
}

function show_conflits() {
  fetch(url + "/stats/" + user_id + "/all")
    .then((response) => response.json())
    .then((data) => {
      const len = data['data'].length;
      their_labels = data['data'].filter(commit => {
        return commit.type;
      });
      $(".participants").html(their_labels.length + " / " + len);

      var compared = 0;
      var conflits = [0, 0, 0, 0, 0]; //[A1, AM1, A2, AM2. AM3]
      for (const [index, c] of my_labels.entries()) {
        var two_commits = their_labels.filter(commit => {
          return commit.commit_id == c.commit_id;
        });
        
        if (c["type"] != "unknown" && c["activities"] != "perfectif,correctif,adaptif") { //it means do not incule those labels in stats
          //Cas 1
          (two_commits[0]['type'] != two_commits[1]['type'] && (c['type'] == two_commits[0]['type'] || c['type'] == two_commits[1]['type'])) ? ++conflits[0] : "";
          (two_commits[0]['activities'] != two_commits[1]['activities'] && (c['activities'] == two_commits[0]['activities'] || c['activities'] == two_commits[1]['activities'])) ? ++conflits[1] : "";

          //Cas 2
          (two_commits[0]['type'] == two_commits[1]['type'] && c['type'] != two_commits[0]['type']) ? ++conflits[2] : "";
          (two_commits[0]['activities'] == two_commits[1]['activities'] && c['activities'] != two_commits[0]['activities']) ? ++conflits[3] : "";

          //Cas 3
          (c['activities'] != two_commits[0]['activities'] && c['activities'] != two_commits[1]['activities'] && two_commits[0]['activities'] != two_commits[1]['activities']) ? ++conflits[4] : "";          
          
          ++compared;
        }
      }
      $(".diff1-atc span").html(conflits[0] + " / " + compared + " (" + (conflits[0] * 100 / compared).toFixed(1) + "%)");
      $(".diff1-am span").html(conflits[1] + " / " + compared + " (" + (conflits[1] * 100 / compared).toFixed(1) + "%)");
      $(".diff2-atc span").html(conflits[2] + " / " + compared + " (" + (conflits[2] * 100 / compared).toFixed(1) + "%)");
      $(".diff2-am span").html(conflits[3] + " / " + compared + " (" + (conflits[3] * 100 / compared).toFixed(1) + "%)");
      $(".diff3-am span").html(conflits[4] + " / " + compared + " (" + (conflits[4] * 100 / compared).toFixed(1) + "%)");

      conflits_ik();
      conflits_by_participants();
      conflits_by_labels();
    });
}

function get_cas(classe, two_commits, c) {
    if (two_commits[0][classe] != two_commits[1][classe] && (c[classe] == two_commits[0][classe] || c[classe] == two_commits[1][classe])) { //Un étudiant pas d'accord 
      return 0;
    } else if (two_commits[0][classe] == two_commits[1][classe] && c[classe] != two_commits[0][classe]) { // deux étudiants pas d'accord
      return 1;
    } else { //3 étiquettes differentes
      return 2;
    }
}

function conflits_ik() {
  var conflits = [[0, 0, 0], [0, 0, 0]];
  var accords = 0;
  var commits_studied = 0;
  for (const [index, c] of my_labels.entries()) {
    var two_commits = their_labels.filter(commit => {
      return commit.commit_id == c.commit_id;
    });
    var flags = [false, false]; //["A","AM"]
    if (c["type"] != "unknown" && c["activities"] != "perfectif,correctif,adaptif") { //it means do not incule those labels in stats
      ++commits_studied;
      if (c["type"] != two_commits[0]["type"] || c["type"] != two_commits[1]["type"]) {
        flags[0] = true;
      }
      if (c["activities"] != two_commits[0]["activities"] || c["activities"] != two_commits[1]["activities"]) {
        flags[1] = true;
      }

      if (flags[0] && flags[1]) {
        const type = ".cas" + (get_cas("type", two_commits, c) + 1) + "_" + (get_cas("activities", two_commits, c) + 1) + " td:nth-child(4)";
        var count = parseInt($(type).html());
        $(type).html(count + 1);
      } else if (flags[0]) {
        ++conflits[0][get_cas("type", two_commits, c)];
      } else if (flags[1]){
        ++conflits[1][get_cas("activities", two_commits, c)];
      } else {
        ++accords;
        //to_download.push(c.commit_id);
      }
    }
  }

  const sum_a = conflits[0].reduce((prev, curr) => prev + curr, 0);
  const sum_am = conflits[1].reduce((prev, curr) => prev + curr, 0);
  const sum_both = commits_studied - accords - sum_a - sum_am;
  
  $(".ik-compared").html(commits_studied);
  $(".ik-accord-total").html(accords);
  $(".ik-desaccord").html(sum_a + sum_am + sum_both);

  $(".ik-a").html("Atomicité = " + sum_a + " <span class='percent'> (" + (sum_a * 100 / commits_studied).toFixed(1) + " %)</span>");
  $(".ik-am").html("AM = " + sum_am + " <span class='percent'> (" + (sum_am * 100 / commits_studied).toFixed(1) + " %)</span>");
  $(".ik-both").html("Les deux = " + sum_both + " <span class='percent'> (" + (sum_both * 100 / commits_studied).toFixed(1) + " %)</span>");
    
  $(".cas1 td:nth-child(2)").html(conflits[0][0]);
  $(".cas1 td:nth-child(3)").html(conflits[1][0]);
  $(".cas2 td:nth-child(2)").html(conflits[0][1]);
  $(".cas2 td:nth-child(3)").html(conflits[1][1]);
  $(".cas3 td:nth-child(2)").html(conflits[0][2]);
  $(".cas3 td:nth-child(3)").html(conflits[1][2]);
}

function conflits_by_labels() {
  var tab = [];
  var disagreements = 0;
  for (const [index, c] of their_labels.entries()) {
    var mine = my_labels.filter(commit => {
      return commit.commit_id == c.commit_id;
    })[0];
    if (c["activities"] != mine["activities"]) {
      const cas = mine["activities"] + "  >>>  " + c["activities"];
      const index = tab.findIndex(x => x.cas === cas);
      if ( mine["type"] != "unknown" && mine["activities"] != "perfectif,correctif,adaptif") { //it means do not include those labels in stats
        if (index != -1) {
          ++tab[index]["occurence"];
        } else {
          tab.push({"cas": cas, "occurence": 1 });
        }
        ++disagreements;
      }
    }
  }
  
  tab.sort((a, b) => b.occurence - a.occurence);

  for (const [index, cas] of tab.entries()) {
    temp += cas["occurence"];
    $(".diff-labels").append("<tr><td>" + cas["cas"] + "</td><td>" + cas["occurence"] + " (" + (cas["occurence"] * 100 / disagreements).toFixed(1) + " %) " + "</td></tr>");
  }
}

function conflits_by_participants() {
  fetch(url + "/users/" + user_id)
    .then((response) => response.json())
    .then((data) => {
      var users = data['data'];
      for (const [i, user] of users.entries()) {
        var conflits = [0, 0]; //[atomicite, AM]
        var his_commits = their_labels.filter(commit => {
          return commit.user_id == user["user_id"];
        });
        var compared = 0;
        for (const [j, c] of his_commits.entries()) {
          const my_commit = my_labels.filter(commit => {
            return commit.commit_id == c["commit_id"];
          })[0];
          if (my_commit["type"] != "unknown" && my_commit["activities"] != "perfectif,correctif,adaptif") {
            (my_commit["type"] != c["type"]) ? ++conflits[0] : "";
            (my_commit["activities"] != c["activities"]) ? ++conflits[1] : "";
            ++compared;
          }
        }
        const val1 = conflits[0] + "/" + compared + " (" + (conflits[0] * 100 / compared).toFixed(1) + "%)";
        const val2 = conflits[1] + "/" + compared + " (" + (conflits[1] * 100 / compared).toFixed(1) + "%)";

        $(".diff-participants").append("<tr id='" + user["user_id"] + "'><td>" + user["name"] + "</td><td>" + his_commits.length + "</td><td>" + val1 + "</td><td>" + val2 + "</td></tr>");

        temp += conflits[1];
      }
    });
}

//Init inputs with the default values
function default_inputs(){
  $('#CheckPerfectif, #CheckAdaptif, #CheckCorrectif').prop('checked', false);
  $("._bjA input").val('');
  $("._bjA").addClass("d-none");
  $(".com-code").removeClass("clustering");
  $("button").removeClass("chosen");
  if ($(".commitNum").html() == 1) {
    $(".backButt").addClass("d-none");
  } else {
    $(".backButt").removeClass("d-none");
  }
  activities = "";
  clusters = [];
  $(".fjuge_com textarea").val("")
}

//Tangled label verification
function clustering_check() {
  clusters = [];
  $("._bjA .cls-desc").each(function (i) {
    var desc = $(this).find("input").val();
    desc = desc.replace('"', "‘");
    desc = desc.replace("'", "‘");
    var cluster = { "number": (i + 1), "lines": "", "description": desc};
    clusters.push(cluster);
  });

  $(".clustering .code").each(function (j) {
    $(this).find("table tr").each(function (k) {
      if (!$(this).hasClass("noChange")) {
        var line = $(this).attr("data-line") + ",";
        var cluster_num = $(this).find(".cluster_num").html();
        if (cluster_num == "?") {
          errors = ["Chaque ligne doit avoir un identifiant."]
          return false;
        }
        var index = clusters.findIndex(x => x.number == cluster_num);
        clusters[index]['lines'] += line;
      }
    });
  });
  
  var final_clusters = [];
  for (const [index, c] of clusters.entries()) {
    if (c["lines"] == "" && c["description"] == "") {
      continue;
    } else {
      if (c["lines"] && c["description"] == "") {
        errors.push("L'identifiant " + c["number"] + " nécessite une description.");
      } else if (c["description"] && c["lines"] == "") {
        errors.push("L'identifiant " + c["number"] + " ne comprend aucune ligne.");
      } 
      final_clusters.push(c);  
    }
  }
  if (final_clusters.length < 2) {
    errors.push("Un commit enchevêtré doit être séparé au moins en deux.");
  }
  clusters = final_clusters;
  return (errors.length)? false : true;
}

//Load a commit from Github
function load_commit() {
  fetch(url + "/scraper/?commit_url=" + current_commit)
    .then((response) => response.json())
    .then((response) => {
      var data = response["data"];
      set_commit_infos();

      $("#temp").html(data["files"]);
      //$(".js-expandable-line").remove();
      $(".com-code").html("");
      $(".file").each(function (i) {
        var file = $(this);
        var file_id = $(file).attr('id');
        $(".com-code").append(file_template((i + 1) ,file_id));
        $(".com-code .code[data-fileId=" + file_id + "] .file_link").html($(file).find(".file-header").attr("data-path"));
        $(".com-code .code[data-fileId=" + file_id + "] .fileName a").attr('href', "https://www.github.com" +  $(file).find("a.dropdown-item.btn-link").attr("href"));
        
        $(file).find("tbody tr").each(function (j) {
          var line = $(this);
          if ($(line).attr("data-hunk")) {
            var line_num = $(line).find(".js-linkable-line-number").attr("data-line-number");
            var code = $(line).find(".blob-code-inner").html();
            var type = "noChange";
            if ($(line).find(".blob-num").hasClass("blob-num-addition")) {
              type = "add";
            } else if ($(line).find(".blob-num").hasClass("blob-num-deletion")) {
              type = "del";
            }
            code.replace(/<[^>]+>/g, '');
            $(".code[data-fileId=" + file_id + "] table").append(lines_template((i + 1), line_num, code, type));
          } else {
            $(".code[data-fileId=" + file_id + "] table").append(code_header($(line).find(".blob-code-inner").html()));
          }
        });
      });
      $(".github_link").attr('href', current_commit)
      $(".changes .selectable").selectable({
        stop: function () {
          if ($(".com-code").hasClass("clustering")) {
            var popup = $(this).closest(".code").find(".clusters_popup");
            $(popup).addClass("d-none");
            $(this).find("tr").each(function (j) {
              if ($(this).hasClass("ui-selected") && !$(this).hasClass("noChange")) {
                $(popup).removeClass("d-none");
                return false;
              }
            });
          }
        }
      });
      set_structure();
      $(".cls_added").remove();
      if (is_labled()) {
        load_commit_labels();
      } else {
        default_inputs();
      }
      //load_juges();
    });
}

//Load a commit labels
function load_commit_labels () {
  fetch(url + "/labels?commit_url=" + current_commit + "&user_id=" + user_id)
    .then((response) => response.json())
    .then((response) => {
      var data = response["data"][0];
      var index = commits.findIndex(x => x.commit_id == current_commit);
      $(".commitNum").html(index + 1);
      if (index == 0) { $(".backButt").addClass("d-none"); }
      
      default_inputs();

      if (data["activities"].includes('perfectif')) {
        $('#CheckPerfectif').prop('checked', true);
      }
      if (data["activities"].includes('adaptif')) {
        $('#CheckAdaptif').prop('checked', true);
      }
      if (data["activities"].includes('correctif')) {
        $('#CheckCorrectif').prop('checked', true);
      }

      var type = ".atomButt";
      if (data["type"] == 'tangled') {
        type = '.tangButt';
        load_commit_clusters();
      } else if (data["type"] == 'unknown') {
        type = '.skipButt';
      }
      $(type).trigger('click');
      $(".fjuge_com textarea").val(data["comments"])
    });
}

//Load a commit clusters
function load_commit_clusters () {
  fetch(url + "/clusters?commit_url=" + current_commit + "&user_id=" + user_id)
    .then((response) => response.json())
    .then((response) => {
      for (const cluster of response["data"]) {
        var cluster_num = cluster["cluster"];
        $("input[data-cluster=" + cluster_num + "]").val(cluster["description"]);
        var lines = cluster["code_lines"].split(',')
        for (const line of lines.slice(0, lines.length -1)) {
          $("tr[data-line="+ line +"] .cluster_num").html(cluster_num);
        }
      }
    });
}

//Return HTML file
function file_template(index, file_id) {
  var html_file = '<div class="row code" data-fileID="'+ file_id +'">' +
                      '<div class="fileName"><a href="" target="_blank"><span>File '+ index + ' >> </span><span class="file_link"></span></div></a>' +
                      '<div class="changes">' +
                        '<table><tbody class="selectable"></tbody></table>' +
                      '</div>' +
                      '<div class="clusters_popup d-none"><span>1</span><span>2</span><span>3</span><span>4</span></div>'
                  '</div>';
  return html_file;
}

//Return HTML code lines
function lines_template(file_num, line_num, code, type) {
  var sign = (type == 'add') ? ' +   ' : (type == 'del') ? ' -   ' : "     ";
  var is_selectable = (type == "noChange") ? "" : "ui-widget-content";
  return '<tr data-line="' + file_num + "-" + line_num + '" class=" ' + type + ' '+ is_selectable +'">' +
            '<td class="cluster_num">?</td>' +
            '<td>' + line_num + '</td>' +
            '<td>' + sign + code +'</td>' +
          '</tr>';
}

function code_header(content) {
  return '<tr class="codeHeader noChange">' +
            '<td class="cluster_num">?</td>' +
            '<td></td>' +
            '<td>' + content +'</td>' +
          '</tr>';
}

//Return commits that the user should label.
function load_user_commits() {
  fetch(url + "/commits/"+ user_id)
    .then((response) => response.json())
    .then((data) => {
      commits = data["data"];
      if (commits.length) {
        for (const [index, c] of commits.entries()) {
          if (!c["type"] || ((index + 1) == commits.length)) {
            current_commit = c["commit_id"];
            $(".commitNum").html(index + 1);
            $(".TotalCom").html(commits.length)
            break;
          }
        }
        load_commit();
        $(".login_view").addClass("d-none");
        $(".mycontainer").removeClass("d-none");
      } else {
        alert("Usernane not found.");
      }
    });
}

//Set commit infos
function set_commit_infos() {
  fetch(url + "/commit?commit_id=" + current_commit)
    .then((response) => response.json())
    .then((data) => {
      commit = data["data"];
      $('.message').html(commit[0]['message']);
      (commit[0]['description']) ? $('.description').html(commit[0]['description']) : $('.description').html("-");
      (commit[0]['issue']) ? $('.issue_link').attr("href", commit[0]['issue']).removeClass("d-none") : $('.issue_link').addClass("d-none");
      (commit[0]['pull']) ? $('.pull_link').attr("href", commit[0]['pull']).removeClass("d-none") : $('.pull_link').addClass("d-none");
    });
}

//Save a commit labels & clusters.
function save_label() {
  fetch(url + "/save_label", {
    method: "post",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      commit_id: current_commit,
      user_id: user_id,
      type: $("button.chosen").attr("data-type"),
      activities: activities,
      clusters: clusters,
      commentaires: $(".fjuge_com textarea").val().replace('"', "‘").replace("'", "‘")
    })
  })
  .then((response) => response.json())
  .then((data) => {
      commits_update();
      var index = parseInt($(".commitNum").html());
      if(index != parseInt($(".TotalCom").html())){
        $(".commitNum").html(index + 1);
        current_commit = commits[index]["commit_id"];
        load_commit();
      } else {
        alert("It's all DONE!! thank you");
      }
   });
}

//Update commits list.
function commits_update() {
  var index = commits.findIndex(x => x.commit_id == current_commit);
  commits[index]['type'] = $("button.chosen").attr("data-type");
}

//Check if a commit is unlabled yet
function is_labled() {
  var index = commits.findIndex(x => x.commit_id == current_commit);
  return commits[index]["type"] != null;
}

//Add lines to a cluster
$('.com-code').on('click', '.clusters_popup span', function () {
  var value = $(this).html();
  var lines = $(this).closest(".code").find("tbody tr");
  $(lines).each(function (index) {
    if ($(this).hasClass("ui-selected")) {
      $(this).find(".cluster_num").html(value);
      $(this).find(".cluster_num").addClass("done")
    }
  });
  $(this).parent().addClass("d-none");
  $(lines).removeClass("ui-selected")
});

$(".structureButt").click(function () {
  $(".structure").modal("show");
  set_structure();
});

function set_structure() {
  $(".structure .modal-body").html("");
  var paths = [];
  $(".com-code .code").each(function (j) {
    var file_path = $(this).find(".file_link").html();
    paths.push(file_path.split("/"));
  });
  
  for (const [i, path] of paths.entries()) {
    var full_path = "";
    for (const [j, name] of path.entries()) {
      var is_file = (j + 1) == path.length;
      var parent = $(".structure div[data-path='" + full_path + "']");
      full_path += "/" + name
      var check = $(".structure div[data-path='" + full_path + "']");
      var location = ($(check).length == 0 && j == 0) ? $(".structure .modal-body") : $(parent);

      if ($(check).length != 0 && is_file == false) { continue;}
      add_RepoFile(location, full_path, name, is_file);
    }
  }
}

function add_RepoFile(location, full_path, name, is_file) {
  var content = (is_file)? "<h4>"+ name + "</h4>" : "<div data-path='"+ full_path +"' >" + "<span>" + name + "</span>" + "</div>";
  $(location).append(content);
}

//Add new cluster
$(".add_cls").click(function () {
  var num = parseInt($(this).prev("div").find("input").attr("data-cluster")) + 1;
  $("<div class='cls-desc cls_added'><label>" + num + ") </label> <input type='text' data-cluster='" + num + "'/></div>").insertBefore(this);
  $(".clusters_popup").append("<span>" + num + "</span>");
});

///Download commits
function download_commits() {
  for (link in to_download) {
    const commit_link = to_download[link];
    httpReq.open("GET", url + "/scraper/?commit_url=" + commit_link, false); 
    httpReq.send();
    var data = JSON.parse(httpReq.responseText)["data"];
    
    $("#temp").html(data["files"]);
    var file_content = [];
    file_content.push(commit_link);
    
    httpReq.open("GET", url + "/commit?commit_id=" + commit_link, false); 
    httpReq.send();
    file_content.push(JSON.parse(httpReq.responseText)["data"][0]["message"]);

    httpReq.open("GET", url + "/labels?commit_url=" + commit_link + "&user_id=BENJIX0", false); 
    httpReq.send();
    var label = JSON.parse(httpReq.responseText)["data"][0];
    file_content.push(label["type"] + "/" + label["activities"]);

    file_content.push("");
    $(".file").each(function (i) {
      var file = $(this);
      file_content.push("==> " + $(file).find(".file-header").attr("data-path")); //File path
      $(file).find("tbody tr").each(function (j) {
        var line = $(this);
        if ($(line).attr("data-hunk")) {
          var line_num = $(line).find(".js-linkable-line-number").attr("data-line-number") + "    "; //Numero de la ligne
          var code = "   " + $(line).find(".blob-code-inner").text(); //la ligne de code
          var sign = " ";
          if ($(line).find(".blob-num").hasClass("blob-num-addition")) {
            sign = "+";
          } else if ($(line).find(".blob-num").hasClass("blob-num-deletion")) {
            sign = "-";
          }
          file_content.push(line_num + sign + code);
        } else {
          file_content.push("       " + $(line).find(".blob-code-inner").html()); //code header
        }
      });
      file_content.push("");
      file_content.push("");
    });
    upload_file(file_content, commit_link);
  } 
}

var upload_file = (function () {
  var a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";
  return function (data, fileName) {
      var blob = new Blob([data.join('\n')], {type: "octet/stream"}),
          url = window.URL.createObjectURL(blob);
      a.href = url;
      a.download = fileName + ".txt";
      a.click();
      window.URL.revokeObjectURL(url);
  };
}());