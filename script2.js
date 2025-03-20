function updateAchievements() {
    const achievementList = document.getElementById('achievement-list');
    achievementList.innerHTML = ''; 

    const sortedModules = [...modules].sort((a, b) => b.mark - a.mark);

    const goldModules = sortedModules.filter(module => module.mark >= 90);
    goldModules.forEach(module => {
        const li = document.createElement('li');
        li.innerHTML = `${module.name} - <img src="images/10.jpg" alt="Gold Medal" class="medal"> (Mark: ${module.mark})`;
        li.classList.add('gold');
        achievementList.appendChild(li);
    });

    const silverModules = sortedModules.filter(module => module.mark >= 80 && module.mark < 90);
    silverModules.forEach(module => {
        const li = document.createElement('li');
        li.innerHTML = `${module.name} - <img src="images/20.jpg" alt="Silver Medal" class="medal"> (Mark: ${module.mark})`;
        li.classList.add('silver');
        achievementList.appendChild(li);
    });

    const bronzeModules = sortedModules.filter(module => module.mark >= 75 && module.mark < 80);
    bronzeModules.forEach(module => {
        const li = document.createElement('li');
        li.innerHTML = `${module.name} - <img src="images/3.jpg" alt="Bronze Medal" class="medal"> (Mark: ${module.mark})`;
        li.classList.add('bronze');
        achievementList.appendChild(li);
    });

    const semesterData = {}; 

    modules.forEach(module => {
        const key = `${module.year}-${module.semester}`;
        if (!semesterData[key]) semesterData[key] = { totalMarks: 0, count: 0 };
        semesterData[key].totalMarks += module.mark;
        semesterData[key].count++;
    });

    const semesterAverages = Object.keys(semesterData).map(key => {
        const data = semesterData[key];
        return { semester: key, avgMark: data.totalMarks / data.count };
    });

    for (let i = 1; i < semesterAverages.length; i++) {
        const prev = semesterAverages[i - 1];
        const curr = semesterAverages[i];
        if (curr.avgMark - prev.avgMark >= 10) {
            const li = document.createElement('li');
            li.innerHTML = `${curr.semester} - Improved by 10+ Marks 🚀 (Prev Avg: ${prev.avgMark.toFixed(1)}, New Avg: ${curr.avgMark.toFixed(1)})`;
            li.classList.add('improvement');
            achievementList.appendChild(li);
        }
    }
}

function downloadCSV() {
    const csvHeaders = ['Module Name', 'Part', 'Semester', 'Mark', 'Classification']; 
    const csvRows = [];
    csvRows.push(csvHeaders.join(','));

    modules.forEach(module => {
        const row = [
            module.name,
            module.part,
            module.semester,
            module.mark,
            module.grade 
        ];
        csvRows.push(row.join(',')); 
    });

    const csvData = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const csvUrl = URL.createObjectURL(csvData);

    const link = document.createElement('a');
    link.href = csvUrl;
    link.download = 'academic_details.csv'; 
    link.click(); 
    URL.revokeObjectURL(csvUrl); 
}

document.addEventListener("DOMContentLoaded", loadGoals);
        
function addGoal() {
    let goalInput = document.getElementById("goalInput").value;
    if (goalInput.trim() === "") return;
    
    let goals = JSON.parse(localStorage.getItem("goals")) || [];
    goals.push({ text: goalInput, progress: 0 });
    localStorage.setItem("goals", JSON.stringify(goals));
    document.getElementById("goalInput").value = "";
    loadGoals();
}

function updateProgress(index) {
    let goals = JSON.parse(localStorage.getItem("goals"));
    goals[index].progress = (goals[index].progress + 10) % 110;
    localStorage.setItem("goals", JSON.stringify(goals));
    loadGoals();
}

function deleteGoal(index) {
    let goals = JSON.parse(localStorage.getItem("goals"));
    goals.splice(index, 1);
    localStorage.setItem("goals", JSON.stringify(goals));
    loadGoals();
}

function loadGoals() {
    let goalList = document.getElementById("goalList");
    goalList.innerHTML = "";
    let goals = JSON.parse(localStorage.getItem("goals")) || [];
    goals.forEach((goal, index) => {
        let li = document.createElement("li");
        li.innerHTML = `${goal.text} - ${goal.progress}% <button onclick="updateProgress(${index})"><i class='bx bx-plus'></i></button> <button onclick="deleteGoal(${index})"><i class='bx bx-message-x'></i></button>`;
        goalList.appendChild(li);
    });
}
