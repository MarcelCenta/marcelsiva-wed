(function () {
    var snowContainer = document.querySelector('[data-snow="true"]');

    if (!snowContainer) {
        snowContainer = document.createElement('div');
        snowContainer.setAttribute('data-snow', 'true');
        document.body.appendChild(snowContainer);
    }

    var i;
    var snowflake;
    var count = 50;

    for (i = 0; i < count; i++) {
        snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        snowflake.innerHTML = '&#10052;';

        snowflake.style.left = Math.random() * 100 + 'vw';
        snowflake.style.fontSize = (Math.random() * 10 + 10) + 'px';
        snowflake.style.opacity = Math.random() * 0.7 + 0.3;
        snowflake.style.animationDuration = (Math.random() * 5 + 5) + 's';
        snowflake.style.animationDelay = '-' + (Math.random() * 10) + 's';

        snowContainer.appendChild(snowflake);
    }
})();
