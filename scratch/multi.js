document.addEventListener('DOMContentLoaded', function() {
  document.querySelector('#lookup').addEventListener('click', lookup);
  document.querySelector('#link').addEventListener('keyup', function(evt) {
      if (evt.keyCode === 13)
          lookup();
  });
});

function get_project_id(url) {
  const re = /scratch.mit.edu\/projects\/(\d+)(?:\/.+)?/;
  const result = re.exec(url);
  return result === null ? null : result[1];
}

function lookup() {
  const urls = document.querySelector('#link').value.split('\n');
  const project_ids = urls.map(get_project_id);
  if (project_ids.some(x => x === null)) {
      set_error('One or more invalid project URLs');
      return;
  }

  const results = {};
  let numResults = 0;

  project_ids.forEach(project_id => {
    fetch(`https://projects.scratch.mit.edu/${project_id}`)
    .then(response => response.json())
    .then(data => {
        if (data.code === 'NotFound') {
            set_error('Project Not Found');
            return;
        }
  
        if (data.targets === undefined) {
            set_error('Error Parsing Project Data');
            return;
        }
  
        const result = parse_data(project_id, data.targets);
        results[project_id] = result;
        numResults++;
        if (numResults === project_ids.length) {
          show_results(project_ids, results);
        }
    })
    .catch(err => {
        console.log(err);
        set_error('Error Analyzing Project Data');
    });
  });
}

function parse_data(project_id, targets) {
  return {
      id: project_id,
      sprites: targets.filter(target => target.isStage === false).length,
      non_cat: targets.filter(target => target.isStage === false).filter(sprite => !is_cat(sprite)).length,
      blocks: targets.map(target => Object.keys(target.blocks).length).reduce((x, y) => x + y),
      conditions: count_blocks(targets, ["control_repeat_until", "control_if_else", "control_if"]),
      loops: count_blocks(targets, ["control_forever", "control_repeat_until", "control_repeat"]),
      variables: count_blocks(targets, ["data_setvariableto", "data_changevariableby", "data_showvariable", "data_hidevariable"]),
      sounds: count_blocks(targets, ["sound_play", "sound_playuntildone"])
  }
}

function show_results(project_ids, results) {
  document.querySelector('#checks-body').innerHTML = '';
  let passed = 0;
  const total = 7;
  project_ids.forEach(project_id => {
    const result = results[project_id];
    const checks = [
      result.sprites >= 2,
      result.non_cat > 0,
      result.blocks >= 3,
      result.conditions > 0,
      result.loops > 0,
      result.variables > 0,
      result.sounds > 0
    ];
    add_result(project_id, checks);
  });
  document.querySelector('#error').style.display = 'none';
  document.querySelector('#results').style.display = 'block';
}

function add_result(project_id, checks) {
  const tr = document.createElement('tr');

  // Name
  const td_name = document.createElement('td');
  td_name.innerHTML = project_id;
  tr.appendChild(td_name);

  // Count
  const td_count = document.createElement('td');
  td_count.innerHTML = checks.reduce((acc, x) => acc + x);
  tr.appendChild(td_count);

  checks.forEach(check => {
    const td = document.createElement('td');
    td.innerHTML = check ? '&#10003;' : '&#10006;';
    td.className = check ? 'passed' : 'failed';
    tr.appendChild(td);
  });

  document.querySelector('#checks-body').appendChild(tr);
}

function count_blocks(targets, blocks) {
  let count = 0;
  for (const target of targets) {
      for (const block in target.blocks) {
          if (blocks.includes(target.blocks[block].opcode)) {
              count++;
          }
      }
  }
  return count;
}

function is_cat(target) {
  const sprite_ids = ["b7853f557e4426412e64bb3da6531a99", "e6ddc55a6ddd9cc9d84fe0b4c21e016f"];
  for (const costume of target.costumes) {
      if (!sprite_ids.includes(costume.assetId)) {
          return false;
      }
  }
  return true;
}

function set_error(err) {
  document.querySelector('#results').style.display = 'none';
  document.querySelector('#error').innerHTML = `Error: ${err}`;
  document.querySelector('#error').style.display = 'block';
}
