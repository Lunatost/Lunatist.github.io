let magazineData = {};
loadMagazineData();
// Funkcja do wczytania danych z pliku JSON
async function loadMagazineData() {
    try {
        const response = await fetch('magazine.json'); // Ścieżka do pliku JSON
        magazineData = await response.json();
        console.log('Magazine data loaded:', magazineData);
        console.log('Data successfully read');
    } catch (error) {
        console.error('Error loading magazine data:', error);
    }
}


// Funkcja do aktualizacji dostępnych opcji w zależności od wybranego materiału
function updateAdditiveOptions(material) {
    const additiveOptions = document.querySelectorAll('.options[data-question="additive"] .option');
    
    // Wyczyść wszystkie opcje
    additiveOptions.forEach(option => option.classList.remove('disabled'));

    // Odklikaj zaznaczoną opcję, jeśli jest zablokowana
    if (material === 'PLA') {
        // Wszystkie opcje dostępne dla PLA
        return;
    } else if (material === 'PET-G' || material === 'ABS' || material === 'TPU' || material === 'PLA_PLUS') {
        // Tylko BRAK, PRZEPUSZCZALNY, MATOWY, ŚWIECĄCY W CIEMNOŚCI, ale nie METAL, DREWNO, PLA+
        ['METAL', 'WOOD'].forEach(value => {
            const option = Array.from(additiveOptions).find(option => option.dataset.value === value);
            option.classList.add('disabled');
            // Odklikaj zablokowane opcje
            if (option.classList.contains('selected')) {
                option.classList.remove('selected');
            }
        });
    }
}

function updateColorOptions(additive) {
    const colorOptions = document.querySelectorAll('.options[data-question="color"] .option');
    colorOptions.forEach(option => option.classList.remove('disabled'));

    if (additive === 'METAL' || additive === 'WOOD' || additive === 'MULTICOLOR') {
        // Wyłącz wszystkie opcje poza OTHER
        colorOptions.forEach(option => {
            if (option.dataset.value !== 'OTHER') {
                option.classList.add('disabled');
                // Odklikaj zablokowane opcje
                if (option.classList.contains('selected')) {
                    option.classList.remove('selected');
                }
            }
        });
    }

}


// Dodanie funkcji do wyboru opcji
document.querySelectorAll('.options').forEach(optionGroup => {
    optionGroup.addEventListener('click', function(event) {
        if (event.target.classList.contains('option') && !event.target.classList.contains('disabled')) {
            // Usuń zaznaczenie z poprzedniej opcji
            this.querySelectorAll('.option').forEach(option => option.classList.remove('selected'));
            // Dodaj zaznaczenie do klikniętej opcji
            event.target.classList.add('selected');

            // Jeśli kliknięto materiał, zaktualizuj dostępne opcje dla dodatków i kolorów
            if (this.dataset.question === 'material') {
                updateAdditiveOptions(event.target.dataset.value);
            }
            else if (this.dataset.question === 'additive') {
                updateColorOptions(event.target.dataset.value);
            }
            calculatePrice();
        }
    });
});

// Dodanie funkcji do aktualizacji ceny przy zmianie wartości w polach input
document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('input', calculatePrice);
});


const resultElement = document.getElementById('calculation-result');

function calculatePrice() {
    const material = document.querySelector('.options[data-question="material"] .option.selected').dataset.value;
    const additive = document.querySelector('.options[data-question="additive"] .option.selected').dataset.value;
    const color = document.querySelector('.options[data-question="color"] .option.selected').dataset.value;
    const weight = document.getElementById('weight').value;
    const quantity = document.getElementById('quantity').value;
    const dimx = document.getElementById('dimx').value;
    const dimy = document.getElementById('dimy').value;
    const dimz = document.getElementById('dimz').value;
    const time = document.querySelector('.options[data-question="time"] .option.selected').dataset.value;
    const finishing = document.querySelector('.options[data-question="finishing"] .option.selected').dataset.value;

    const materialDataForSelectedMaterial = magazineData[material] || {};
    const additiveDataForSelectedAdditive = materialDataForSelectedMaterial[additive] || {};
    const availableQuantity = additiveDataForSelectedAdditive[color] || 0;

    let materialPrice = 0;
    let printerPrice = 0;
    let nozzlePrice = 0;
    let bedPrice = 0;
    let finishingPrice = 0;
    let totalPrice = 0;
    let totalWeight = weight * quantity;

    // Aktualizacja dostępnych opcji czasu druku
    updateTimeOptions(totalWeight, availableQuantity);

    if (totalWeight > availableQuantity) {
        let To_order = Math.ceil(totalWeight / 1000);
        if (totalWeight < 500) {
            materialPrice = 0.8 * To_order * filamentsPrice(material, additive);
        } else {
            materialPrice = (totalWeight / 1000) * 1.1 * To_order * filamentsPrice(material, additive);
        }
    } else {
        materialPrice = (totalWeight / 1000) * filamentsPrice(material, additive);
    }

    printerPrice = 1 * ((weight * quantity) / 30); // 2zł za godzinę druku (30g/h)
    
    if ((material === 'PLA' || material === 'PET-G') && additive === 'NONE') {
        nozzlePrice = (weight * quantity / 1000) * 15; // 15zł za każdy kg
    } else {
        nozzlePrice = (weight * quantity / 1000) * 20; // 20zł za każdy kg
    }

    bedPrice = (weight * quantity / 1000) * 20; // 10zł za każdy kg

    if (finishing === 'TAK') {
        finishingPrice = (0.003 * (parseFloat(dimx) + parseFloat(dimy) + parseFloat(dimz)) + 0.3)*quantity;
    }

    totalPrice = materialPrice + printerPrice + nozzlePrice + bedPrice + finishingPrice;
    console.log(materialPrice, printerPrice, nozzlePrice, bedPrice, finishingPrice, totalPrice);
    if(time === 'SHORT') {
        totalPrice *= 1.3;
        totalPrice += 10;
    } else if(time === 'MIDIUM') {
        totalPrice *= 1.15;
        totalPrice += 5;
    }

    // 75% marży
    totalPrice *= 1.75;

    if(totalPrice > 150) {
        totalPrice *= 0.9;
    } else if(totalPrice > 300) {
        totalPrice *= 0.8;
    } else if(totalPrice > 600) {
        totalPrice *= 0.7;
    }
    if (totalPrice !== 0 && weight !== 0 && quantity !== 0 && dimx !== 0 && dimy !== 0 && dimz !== 0) {
        resultElement.textContent = `Cena: ${totalPrice.toFixed(2)} zł`;
    } else {
        resultElement.textContent = '--';
    }

}

function updateTimeOptions(totalWeight, availableQuantity) {
    const timeOptions = document.querySelectorAll('.options[data-question="time"] .option');

    // Zablokuj opcje SHORT i MIDIUM, jeśli totalWeight > availableQuantity
    timeOptions.forEach(option => option.classList.remove('disabled')); // Najpierw odblokuj wszystkie opcje

    if (totalWeight >= availableQuantity) {
        ['SHORT', 'MIDIUM'].forEach(value => {
            const option = Array.from(timeOptions).find(option => option.dataset.value === value);
            if (option) {
                option.classList.add('disabled');
                if (option.classList.contains('selected')) {
                    option.classList.remove('selected'); // Usuń zaznaczenie z zablokowanej opcji
                }
            }
        });
    }
}


function filamentsPrice(material, additive) {
    if (material === 'PLA') {
        x = 80;
    } else if (material === 'PET-G') {
        x = 80;
    }  else if (material === 'ABS') {
        x = 90;
    }  else if (material === 'TPU') {
        x = 100;
    }  else if (material === 'PLA_PLUS') {
        x = 90;
    }
    if (additive === 'METAL') {
        x += 40;
    } else if (additive === 'WOOD') {
        x += 30;
    } else if (additive === 'TRANSPARENT' || additive === 'GLOW_IN_THE_DARK' || additive === 'MULTICOLOR') {
        x += 10;
    }
    return x;
}