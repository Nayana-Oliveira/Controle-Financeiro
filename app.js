document.addEventListener('DOMContentLoaded', () => {
    const expenseForm = document.getElementById('expense-form');
    const expenseList = document.getElementById('expense-list');
    const totalSpentEl = document.getElementById('total-spent');
    const categoryChartEl = document.getElementById('category-chart').getContext('2d');
    
    const themeToggle = document.getElementById('theme-toggle');
    const monthlyBudgetInput = document.getElementById('monthly-budget');
    const remainingBalanceEl = document.getElementById('remaining-balance');
    const budgetProgress = document.getElementById('budget-progress');
    const searchInput = document.getElementById('search-input');
    const filterCategory = document.getElementById('filter-category');
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const cancelEditBtn = document.getElementById('cancel-edit');

    let expenses = [];
    let budget = 0;
    let categoryChart; 
    const CATEGORIES = ["Alimentação", "Transporte", "Lazer", "Saúde", "Moradia", "Outros"];

    const saveState = () => {
        const appState = { expenses, budget };
        localStorage.setItem('appState', JSON.stringify(appState));
    };

    const loadState = () => {
        const appState = JSON.parse(localStorage.getItem('appState'));
        if (appState) {
            expenses = appState.expenses || [];
            budget = appState.budget || 0;
            monthlyBudgetInput.value = budget > 0 ? budget : '';
        }
    };

    const renderExpenses = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedCategory = filterCategory.value;

        const filteredExpenses = expenses.filter(expense => {
            const matchesSearch = expense.description.toLowerCase().includes(searchTerm);
            const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });

        expenseList.innerHTML = ''; 
        if (filteredExpenses.length === 0) {
            expenseList.innerHTML = '<tr><td colspan="5" class="empty-state"><i class="fas fa-receipt"></i><p>Nenhuma despesa encontrada.</p></td></tr>';
            return;
        }

        filteredExpenses.forEach(expense => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>R$ ${expense.value.toFixed(2)}</td>
                <td><span class="category-badge">${expense.category}</span></td>
                <td>${new Date(expense.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td>${expense.description}</td>
                <td class="action-buttons">
                    <button class="edit-btn" data-id="${expense.id}"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" data-id="${expense.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            expenseList.appendChild(row);
        });
    };

    const updateSummaryAndBudget = () => {
        const totalSpent = expenses.reduce((sum, expense) => sum + expense.value, 0);
        const remainingBalance = budget - totalSpent;

        totalSpentEl.textContent = `R$ ${totalSpent.toFixed(2)}`;
        remainingBalanceEl.textContent = `R$ ${remainingBalance.toFixed(2)}`;
        
        if (budget > 0) {
            const progressPercentage = Math.min((totalSpent / budget) * 100, 100);
            budgetProgress.style.width = `${progressPercentage}%`;
            budgetProgress.classList.toggle('budget-alert', totalSpent > budget);
        } else {
            budgetProgress.style.width = '0%';
        }
    };

    const updateChart = () => {
        const spendingByCategory = expenses.reduce((acc, expense) => {
            acc[expense.category] = (acc[expense.category] || 0) + expense.value;
            return acc;
        }, {});

        const labels = Object.keys(spendingByCategory);
        const data = Object.values(spendingByCategory);

        if (categoryChart) categoryChart.destroy(); 

        categoryChart = new Chart(categoryChartEl, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ 
                    data, 
                    backgroundColor: [
                        '#e74c3c', 
                        '#3498db', 
                        '#f1c40f', 
                        '#2ecc71', 
                        '#9b59b6', 
                        '#e67e22'
                    ], 
                    borderWidth: 0,
                    borderRadius: 6,
                    hoverOffset: 12
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { 
                        position: 'bottom',
                        labels: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-color'),
                            font: {
                                size: 12
                            }
                        }
                    } 
                },
                cutout: '60%'
            }
        });
    };

    const populateCategoryFilters = () => {
        CATEGORIES.forEach(cat => {
            const option = new Option(cat, cat);
            filterCategory.add(option.cloneNode(true));
            document.getElementById('edit-category').add(option.cloneNode(true));
        });
    };

    const handleAddExpense = (e) => {
        e.preventDefault();
        const newExpense = {
            id: Date.now(),
            value: parseFloat(document.getElementById('expense-value').value),
            category: document.getElementById('expense-category').value,
            date: document.getElementById('expense-date').value,
            description: document.getElementById('expense-description').value || 'N/A'
        };
        expenses.push(newExpense);
        saveState();
        renderAll();
        expenseForm.reset();
    };

    const handleListClick = (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const id = parseInt(button.dataset.id, 10);
        if (button.classList.contains('delete-btn')) {
            expenses = expenses.filter(exp => exp.id !== id);
        } else if (button.classList.contains('edit-btn')) {
            const expenseToEdit = expenses.find(exp => exp.id === id);
            document.getElementById('edit-id').value = expenseToEdit.id;
            document.getElementById('edit-value').value = expenseToEdit.value;
            document.getElementById('edit-category').value = expenseToEdit.category;
            document.getElementById('edit-date').value = expenseToEdit.date;
            document.getElementById('edit-description').value = expenseToEdit.description;
            editModal.showModal();
        }
        saveState();
        renderAll();
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        const id = parseInt(document.getElementById('edit-id').value, 10);
        const expenseIndex = expenses.findIndex(exp => exp.id === id);
        if (expenseIndex > -1) {
            expenses[expenseIndex] = {
                id,
                value: parseFloat(document.getElementById('edit-value').value),
                category: document.getElementById('edit-category').value,
                date: document.getElementById('edit-date').value,
                description: document.getElementById('edit-description').value
            };
        }
        saveState();
        renderAll();
        editModal.close();
    };

    const handleBudgetUpdate = () => {
        budget = parseFloat(monthlyBudgetInput.value) || 0;
        saveState();
        updateSummaryAndBudget();
    };

    const applyTheme = (isDark) => {
        document.body.classList.toggle('dark-mode', isDark);
        themeToggle.checked = isDark;
        
        if (categoryChart) {
            updateChart();
        }
    };

    const toggleTheme = () => {
        const isDark = themeToggle.checked;
        localStorage.setItem('darkMode', isDark);
        applyTheme(isDark);
    };

    const renderAll = () => {
        renderExpenses();
        updateSummaryAndBudget();
        updateChart();
    };

    const init = () => {
        expenseForm.addEventListener('submit', handleAddExpense);
        expenseList.addEventListener('click', handleListClick);
        monthlyBudgetInput.addEventListener('change', handleBudgetUpdate);
        searchInput.addEventListener('input', renderExpenses);
        filterCategory.addEventListener('change', renderExpenses);
        editForm.addEventListener('submit', handleEditSubmit);
        cancelEditBtn.addEventListener('click', () => editModal.close());
        themeToggle.addEventListener('change', toggleTheme);

        populateCategoryFilters();
        loadState();
        
        const savedThemeIsDark = localStorage.getItem('darkMode') === 'true';
        applyTheme(savedThemeIsDark);
        
        renderAll();
    };

    init();
});