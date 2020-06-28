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
    const url = document.querySelector('#link').value;
    const project_id = get_project_id(url);
    if (project_id === null) {
        set_error('Invalid Project URL');
        return;
    }

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

        const results = parse_data(project_id, data.targets);
        show_results(results);
    })
    .catch(err => {
        console.log(err);
        set_error('Error Analyzing Project Data');
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

function show_results(results) {
    document.querySelector('#checks-body').innerHTML = '';
    let passed = 0;
    const total = 7;
    passed += add_result("at least two sprites", results.sprites >= 2);
    passed += add_result("uses a non-cat sprite", results.non_cat > 0);
    passed += add_result("at least three blocks", results.blocks >= 3);
    passed += add_result("uses a condition", results.conditions > 0);
    passed += add_result("uses a loop", results.loops > 0);
    passed += add_result("uses a variable", results.variables > 0);
    passed += add_result("uses a sound", results.sounds > 0);
    document.querySelector('#project-name').innerHTML = `Project ${results.id}`;
    document.querySelector('#project-count').innerHTML = `${passed} of ${total} checks passed`;
    document.querySelector('#error').style.display = 'none';
    document.querySelector('#results').style.display = 'block';
}

function add_result(name, pass) {
    const tr = document.createElement('tr');
    const td_pass = document.createElement('td');
    td_pass.innerHTML = pass ? '&#10003;' : '&#10006;';
    td_pass.className = pass ? 'passed' : 'failed';
    const td_name = document.createElement('td');
    td_name.innerHTML = name;
    tr.appendChild(td_pass);
    tr.appendChild(td_name);
    document.querySelector('#checks-body').appendChild(tr);
    return pass ? 1 : 0;
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
