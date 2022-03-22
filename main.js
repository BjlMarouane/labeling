var user_id = "";
var current_commit = "";
var commits = [];
var activities = "";
var clusters = [];
var errors = [];
var url = (document.URL.indexOf("https") == -1) ? "http://localhost:3000" : "https://protected-hamlet-78090.herokuapp.com";

$(".backButt").click(function () {
  current_commit = commits[parseInt($(".commitNum").html()) - 2]["commit_id"];
  load_commit();
});

//Login clic
$(".loginButt").click(function () {
  user_id = $(".login_view input").val();
  if (user_id) {
    load_user_commits();
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
}

//Tangled label verification
function clustering_check() {
  clusters = [];
  $("._bjA .cls-desc").each(function (i) {
    var cluster = { "number": (i + 1), "lines": "", "description": $(this).find("input").val() };
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
      //$(".project-name").html(data["project"]);
      //$(".message").html(data["message"]);

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
      } else if (data["type"] == 'unknown') { type = '.skipButt'; }
      $(type).trigger('click');
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
        if (commits[commits.length - 1]["type"]) {
          alert("You finished all the commits, Thank you for your time");
        } else {
          for (const [index, c] of commits.entries()) {
            if (!c["type"]) {
              current_commit = c["commit_id"];
              $(".commitNum").html(index + 1);
              $(".TotalCom").html(commits.length)
              break;
            }
          }
          load_commit();
          $(".login_view").addClass("d-none");
          $(".mycontainer").removeClass("d-none");
        }
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
      clusters: clusters
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
        window.location.reload();
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
      var parent = $(".structure div[data-path='" + full_path + "']");;
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