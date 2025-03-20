document.addEventListener('DOMContentLoaded', function () {
    const sidebarLinks = document.querySelectorAll('.sidebar-menu li a');
    const sections = document.querySelectorAll('section');
    const inputSection = document.getElementById('input');
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.getElementById('menu-toggle');

    function checkScreenSize() {
        if (window.innerWidth > 768) {
            sidebar.classList.add('active');  
        } else {
            sidebar.classList.remove('active'); 
        }
    }

    checkScreenSize();

    menuToggle.addEventListener('click', function () {
        sidebar.classList.toggle('active');
    });

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function (event) {
            event.preventDefault();

            const targetId = this.getAttribute('href').substring(1);

            sections.forEach(section => {
                section.classList.remove('active');
                section.style.display = 'none';
            });

            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
                targetSection.style.display = 'block';
            }

            if (targetId !== 'input') {
                inputSection.style.display = 'none';
            }

            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            }
        });
    });

    inputSection.classList.add('active');
    inputSection.style.display = 'block';

    window.addEventListener('resize', checkScreenSize);
});

let modules = JSON.parse(localStorage.getItem('modules')) || [];

function addModule() {
    const name = document.getElementById('module-name').value.trim();
    const year = document.getElementById('year').value.trim();
    const part = document.getElementById('part').value.trim();
    const semester = document.getElementById('semester').value.trim();
    const mark = document.getElementById('mark').value.trim();
    const grade = document.getElementById('grade').value.trim();

    if (!name || !year || !part || !semester || !mark || !grade) {
        alert("Input details!");
        return;
    }

    const semesterNumber = parseInt(semester);
    const markNumber = parseFloat(mark);

    if (isNaN(semesterNumber) || isNaN(markNumber)) {
        alert("Semester and Mark must be valid numbers.");
        return;
    }

    if (markNumber < 0 || markNumber > 100) {
        alert("Mark must be between 0 and 100.");
        return;
    }

    const module = { name, year, part, semester: semesterNumber, mark: markNumber, grade };

    modules.push(module);
    localStorage.setItem('modules', JSON.stringify(modules));
    displayModules();
    updateStatistics();
    document.getElementById('module-form').reset();
}

document.getElementById('add-module-btn').addEventListener('click', addModule);

function displayModules() {
    const moduleTableBody = document.getElementById('module-table-body');
    moduleTableBody.innerHTML = modules.map((module, index) => `
        <tr>
            <td data-label="Course Name">${module.name}</td>
            <td data-label="Academic Year">${module.year}</td>
            <td data-label="Part">${module.part}</td>
            <td data-label="Semester">${module.semester}</td>
            <td data-label="Mark">${module.mark}</td>
            <td data-label="Classification">${module.grade}</td>
            <td data-label="Actions">
                <button class="edit-btn" onclick="editModule(${index})"><i class='bx bx-edit-alt'></i></button>
                <button class="delete-btn" onclick="deleteModule(${index})"><i class='bx bx-message-x'></i></button>
            </td>
        </tr>
    `).join('');
}

displayModules();

function editModule(index) {
    const module = modules[index];

    const newName = prompt("Edit Course Name:", module.name);
    if (newName === null || newName === "") return;

    const newYear = prompt("Edit Academic Year:", module.year);
    if (newYear === null || newYear === "") return;

    const newPart = prompt("Edit Part:", module.part);
    if (newPart === null || newPart === "") return;

    const newSemester = prompt("Edit Semester:", module.semester);
    if (newSemester === null || newSemester === "") return;

    const newMark = prompt("Edit Mark:", module.mark);
    if (newMark === null || newMark === "") return;

    const newGrade = prompt("Edit Classification (1 / 2.1 / 2.2 / P / F):", module.grade);
    if (newGrade === null || newGrade === "") return;

    modules[index] = { name: newName, year: newYear, part: newPart, semester: parseInt(newSemester), mark: parseFloat(newMark), grade: newGrade };

    localStorage.setItem('modules', JSON.stringify(modules));
    displayModules();
    updateStatistics();
    alert("Module updated successfully!");
}

function deleteModule(index) {
    modules.splice(index, 1);
    localStorage.setItem('modules', JSON.stringify(modules));
    displayModules();
    updateStatistics();
}

function renderGraph() { 
    const partData = {};

    modules.forEach(module => {
        const key = `Part ${module.part} - Semester ${module.semester}`;
        if (!partData[key]) {
            partData[key] = { totalMarks: 0, count: 0 };
        }
        partData[key].totalMarks += module.mark;
        partData[key].count += 1;
    });

    const labels = Object.keys(partData);
    const averageMarks = labels.map(label => (partData[label].totalMarks / partData[label].count).toFixed(1));

    const ctx = document.getElementById('semesterGraph').getContext('2d');
    const existingChart = Chart.getChart("semesterGraph");
    if (existingChart) {
        existingChart.destroy();
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average Marks',
                data: averageMarks,
                backgroundColor: 'rgb(0, 11, 71)',
                borderColor: 'rgb(0, 0, 0)',
                borderWidth: 2
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100 
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {  
                    enabled: false 
                },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    formatter: (value) => value,
                    color: '#000',
                    font: {
                        weight: 'bold',
                        size: 14
                    }
                },
            }
        },
        plugins: [ChartDataLabels]
    });
}

document.addEventListener('DOMContentLoaded', function () {
    updateStatistics(); 
});

function updateStatistics() {
    const statsData = {}; 
    let totalMarks = 0, totalCourses = 0; 

    modules.forEach(module => {
        const key = `Part ${module.part} - Sem ${module.semester}`;

        if (!statsData[key]) {
            statsData[key] = { distinctions: 0, twos_1: 0, twos_2: 0, passes: 0 };
        }

        if (module.grade === '1') statsData[key].distinctions++;
        if (module.grade === '2.1') statsData[key].twos_1++;
        if (module.grade === '2.2') statsData[key].twos_2++;
        if (module.grade === 'P') statsData[key].passes++;

        totalMarks += module.mark; 
        totalCourses++; 
    });

    const overallAverage = totalCourses > 0 ? (totalMarks / totalCourses).toFixed(1) : "0";

    renderGraph();

    document.getElementById('total-marks').textContent = totalMarks;
    document.getElementById('average').textContent = overallAverage;
    renderPieChart();
    updateAchievements();
}

function renderPieChart() {
    const classificationData = {
        distinctions: 0,
        twos_1: 0,
        twos_2: 0,
        passes: 0
    };

    modules.forEach(module => {
        if (module.grade === '1') classificationData.distinctions++;
        if (module.grade === '2.1') classificationData.twos_1++;
        if (module.grade === '2.2') classificationData.twos_2++;
        if (module.grade === 'P') classificationData.passes++;
    });

    const ctx = document.getElementById('classificationPieChart').getContext('2d');
    const existingPieChart = Chart.getChart("classificationPieChart");
    if (existingPieChart) {
        existingPieChart.destroy();
    }

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Distinctions (1\'s)', '2.1\'s', '2.2\'s', 'P\'s'],
            datasets: [{
                data: Object.values(classificationData),
                backgroundColor: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'],
                borderColor: '#000000',
                borderWidth: 2
            }]
        },
        options: {
            plugins: {
                tooltip: {  
                    enabled: false 
                },
                datalabels: {
                    formatter: (value) => value,
                    color: '#000',
                    font: {
                        weight: 'bold',
                        size: 14
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}



