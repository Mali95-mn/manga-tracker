/* =========================================================
   MANGA TRACKER
   Version 1.0

   Aktuelle Speicherung:
   localStorage

   SpÃ¤ter:
   Supabase fÃ¼r Online-Speicherung
========================================================= */


/* =========================================================
   DATEN
========================================================= */
const SUPABASE_URL = "https://pewqcbqjkljgghlymdym.supabase.co";

const SUPABASE_KEY = "sb_publishable_TSP6G0PC7EibROcTqgJwSQ_kRt1LVrH";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

supabaseClient.auth.getUser().then(({ data, error }) => {
    if (error) {
        console.error("Benutzer konnte nicht geladen werden:", error);
        return;
    }

    console.log("Angemeldeter Benutzer:", data.user);
});

// ================================
// SUPABASE AUTHENTIFIZIERUNG
// ================================

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginButton = document.getElementById("login-button");
const loginMessage = document.getElementById("login-message");

const registerEmail = document.getElementById("register-email");
const registerPassword = document.getElementById("register-password");
const registerButton = document.getElementById("register-button");
const registerMessage = document.getElementById("register-message");

const showRegisterButton = document.getElementById("show-register-button");
const showLoginButton = document.getElementById("show-login-button");


// Zwischen Login und Registrierung wechseln
showRegisterButton.addEventListener("click", () => {
    loginForm.style.display = "none";
    registerForm.style.display = "block";
});

showLoginButton.addEventListener("click", () => {
    registerForm.style.display = "none";
    loginForm.style.display = "block";
});


// ================================
// REGISTRIEREN
// ================================

registerButton.addEventListener("click", async () => {

    const email = registerEmail.value.trim();
    const password = registerPassword.value;

    if (!email || !password) {
        registerMessage.textContent =
            "Bitte E-Mail und Passwort eingeben.";
        return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password
    });

    if (error) {
        registerMessage.textContent =
            "Fehler: " + error.message;
        return;
    }

    registerMessage.textContent =
        "Registrierung erfolgreich! Bitte bestÃ¤tige deine E-Mail-Adresse.";
});


// ================================
// ANMELDEN
// ================================

loginButton.addEventListener("click", async () => {

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
        loginMessage.textContent =
            "Bitte E-Mail und Passwort eingeben.";
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        loginMessage.textContent =
            "Fehler: " + error.message;
        return;
    }

    loginMessage.textContent =
        "Erfolgreich angemeldet!";
       
        await loadManga();

        render();

        updateStatistics();

        updateGenreFilter();    
});

let mangaList = [];

let editingMangaId = null;



/* =========================================================
   ELEMENTE AUS HTML HOLEN
========================================================= */

const mangaGrid = document.getElementById("mangaGrid");
const emptyState = document.getElementById("emptyState");

const mangaCount = document.getElementById("mangaCount");
const volumeCount = document.getElementById("volumeCount");
const readCount = document.getElementById("readCount");
const averageRating = document.getElementById("averageRating");

const resultInfo = document.getElementById("resultInfo");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const genreFilter = document.getElementById("genreFilter");
const sortSelect = document.getElementById("sortSelect");

const mangaModal = document.getElementById("mangaModal");
const detailsModal = document.getElementById("detailsModal");

const mangaForm = document.getElementById("mangaForm");

const modalTitle = document.getElementById("modalTitle");

const closeModalButton =
    document.getElementById("closeModalButton");

const cancelButton =
    document.getElementById("cancelButton");

const addMangaButton =
    document.getElementById("addMangaButton");

const emptyAddButton =
    document.getElementById("emptyAddButton");

const closeDetailsButton =
    document.getElementById("closeDetailsButton");

const exportButton =
    document.getElementById("exportButton");

const importButton =
    document.getElementById("importButton");

const importFile =
    document.getElementById("importFile");

const deleteAllButton =
    document.getElementById("deleteAllButton");


/* =========================================================
   INITIALISIERUNG
========================================================= */

render();

updateStatistics();

updateGenreFilter();

/* =========================================================
   SUPABASE MANGA-SPEICHERUNG
========================================================= */

async function getCurrentUser() {

    const {
        data,
        error
    } = await supabaseClient.auth.getUser();

    if (error) {

        console.error(
            "Benutzer konnte nicht geladen werden:",
            error
        );

        return null;
    }

    return data.user;
}


/* =========================================================
   MANGA AUS SUPABASE LADEN
========================================================= */

async function loadManga() {

    const user = await getCurrentUser();

    if (!user) {

        mangaList = [];

        return;
    }

    const {
        data,
        error
    } = await supabaseClient
        .from("manga")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
            ascending: true
        });

    if (error) {

        console.error(
            "Manga konnten nicht geladen werden:",
            error
        );

        alert(
            "Die Manga konnten nicht geladen werden:\n" +
            error.message
        );

        mangaList = [];

        return;
    }

    mangaList = (data || []).map(row => ({

        id: Number(row.id),

        title: row.title || "",

        author: row.author || "",

        publisher: row.publisher || "",

        volumeTotal:
            Number(row.total_volumes || 0),

        volumeRead:
            Number(row.read_volumes || 0),

        status: row.status || "",

        rating:
            Number(row.rating || 0),

        genres: row.genres
            ? String(row.genres)
                .split(",")
                .map(g => g.trim())
                .filter(Boolean)
            : [],

        cover: row.cover_url || "",

        notes: row.notes || "",

        createdAt:
            row.created_at ||
            new Date().toISOString()
    }));
}


/* =========================================================
   MANGA IN SUPABASE SPEICHERN
========================================================= */

async function saveManga() {

    const user = await getCurrentUser();

    if (!user) {

        console.warn(
            "Keine Speicherung möglich: " +
            "kein Benutzer angemeldet."
        );

        return false;
    }


    /*
       Zuerst die bisherige Sammlung
       dieses Benutzers löschen.
    */

    const {
        error: deleteError
    } = await supabaseClient
        .from("manga")
        .delete()
        .eq("user_id", user.id);


    if (deleteError) {

        console.error(
            "Alte Manga konnten nicht gelöscht werden:",
            deleteError
        );

        alert(
            "Speichern fehlgeschlagen:\n" +
            deleteError.message
        );

        return false;
    }


    /*
       Wenn die Sammlung leer ist,
       müssen wir nichts mehr einfügen.
    */

    if (mangaList.length === 0) {

        return true;
    }


    /*
       Unsere JavaScript-Daten in
       Supabase-Spalten umwandeln.
    */

    const rows = mangaList.map(manga => ({

        user_id: user.id,

        title: manga.title || "",

        author: manga.author || "",

        publisher: manga.publisher || "",

        total_volumes:
            Number(manga.volumeTotal || 0),

        owned_volumes: 0,

        read_volumes:
            Number(manga.volumeRead || 0),

        status: manga.status || "",

        rating:
            Number(manga.rating || 0),

        genres:
            Array.isArray(manga.genres)
                ? manga.genres.join(", ")
                : String(manga.genres || ""),

        isbn: "",

        cover_url: manga.cover || "",

        notes: manga.notes || ""
    }));

    console.log("ROWS:", JSON.stringify(rows, null, 2));

    const {
        error: insertError
    } = await supabaseClient
        .from("manga")
        .insert(rows);


    if (insertError) {

        console.error(
            "Manga konnten nicht gespeichert werden:",
            insertError
        );

        alert(
            "Speichern fehlgeschlagen:\n" +
            insertError.message
        );

        return false;
    }

    return true;
}


/* =========================================================
   MANGA HINZUFÃœGEN
========================================================= */

addMangaButton.addEventListener(
    "click",
    openAddModal
);

emptyAddButton.addEventListener(
    "click",
    openAddModal
);


function openAddModal() {

    editingMangaId = null;

    modalTitle.textContent =
        "Manga hinzufÃ¼gen";

    mangaForm.reset();

    document.getElementById("mangaId").value = "";

    document.getElementById("volumeTotal").value = 0;

    document.getElementById("volumeRead").value = 0;

    mangaModal.classList.remove("hidden");

    document.getElementById("title").focus();

}


/* =========================================================
   FORMULAR ABSENDEN
========================================================= */

mangaForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        const title =
            document.getElementById("title")
                .value
                .trim();

        const author =
            document.getElementById("author")
                .value
                .trim();

        const publisher =
            document.getElementById("publisher")
                .value
                .trim();

        const volumeTotal =
            Number(
                document.getElementById("volumeTotal")
                    .value
            );

        let volumeRead =
            Number(
                document.getElementById("volumeRead")
                    .value
            );

        const status =
            document.getElementById("status")
                .value;

        const rating =
            Number(
                document.getElementById("rating")
                    .value
            );

        const genreInput =
            document.getElementById("genre")
                .value
                .trim();

        const cover =
            document.getElementById("cover")
                .value
                .trim();

        const notes =
            document.getElementById("notes")
                .value
                .trim();


        if (!title) {

            alert(
                "Bitte gib einen Titel ein."
            );

            return;
        }


        if (volumeRead > volumeTotal) {

            volumeRead = volumeTotal;

        }


        const genres =
            genreInput
                ? genreInput
                    .split(",")
                    .map(
                        genre => genre.trim()
                    )
                    .filter(
                        genre => genre !== ""
                    )
                : [];


        /* -----------------------------------------
           BEARBEITEN
        ----------------------------------------- */

        if (editingMangaId) {

            const manga =
                mangaList.find(
                    manga =>
                        manga.id === editingMangaId
                );

            if (manga) {

                manga.title = title;
                manga.author = author;
                manga.publisher = publisher;
                manga.volumeTotal = volumeTotal;
                manga.volumeRead = volumeRead;
                manga.status = status;
                manga.rating = rating;
                manga.genres = genres;
                manga.cover = cover;
                manga.notes = notes;

            }

        }


        /* -----------------------------------------
           NEU ANLEGEN
        ----------------------------------------- */

        else {

            const newManga = {

                id: createId(),

                title: title,

                author: author,

                publisher: publisher,

                volumeTotal: volumeTotal,

                volumeRead: volumeRead,

                status: status,

                rating: rating,

                genres: genres,

                cover: cover,

                notes: notes,

                createdAt:
                    new Date().toISOString()

            };


            mangaList.push(newManga);

        }

        await saveManga();

        closeMangaModal();
        
        async function initializeApp() {

             await loadManga();

            render();

             updateStatistics();

            updateGenreFilter();
        }

        initializeApp();
        }
);


/* =========================================================
   MANGA BEARBEITEN
========================================================= */

function editManga(id) {

    const manga =
        mangaList.find(
            manga => manga.id === id
        );

    if (!manga) {
        return;
    }


    editingMangaId = id;

    modalTitle.textContent =
        "Manga bearbeiten";


    document.getElementById("mangaId").value =
        manga.id;

    document.getElementById("title").value =
        manga.title;

    document.getElementById("author").value =
        manga.author;

    document.getElementById("publisher").value =
        manga.publisher;

    document.getElementById("volumeTotal").value =
        manga.volumeTotal;

    document.getElementById("volumeRead").value =
        manga.volumeRead;

    document.getElementById("status").value =
        manga.status;

    document.getElementById("rating").value =
        manga.rating;

    document.getElementById("genre").value =
        manga.genres.join(", ");

    document.getElementById("cover").value =
        manga.cover;

    document.getElementById("notes").value =
        manga.notes;


    mangaModal.classList.remove("hidden");

}


/* =========================================================
   MANGA LÃ–SCHEN
========================================================= */

async function deleteManga(id) {

    const manga =
        mangaList.find(
            manga => manga.id === id
        );

    if (!manga) {
        return;
    }


    const confirmed =
        confirm(
            `MÃ¶chtest du "${manga.title}" wirklich lÃ¶schen?`
        );


    if (!confirmed) {
        return;
    }


    mangaList =
        mangaList.filter(
            manga => manga.id !== id
        );


    await saveManga();

    render();

    updateStatistics();

    updateGenreFilter();

}


/* =========================================================
   MANGA DETAILS
========================================================= */

function showDetails(id) {

    const manga =
        mangaList.find(
            manga => manga.id === id
        );

    if (!manga) {
        return;
    }


    document.getElementById("detailsTitle")
        .textContent = manga.title;


    const progress =
        calculateProgress(manga);


    const stars =
        manga.rating > 0
            ? "â­".repeat(manga.rating)
            : "Keine Bewertung";


    const genres =
        manga.genres.length > 0
            ? manga.genres.join(", ")
            : "Keine Angabe";


    let coverHTML;


    if (manga.cover) {

        coverHTML = `
            <img
                src="${escapeHTML(manga.cover)}"
                class="details-cover"
                alt="Cover von ${escapeHTML(manga.title)}"
                onerror="this.style.display='none'"
            >
        `;

    } else {

        coverHTML = `
            <div class="manga-cover-placeholder">
                ***
            </div>
        `;

    }


    const detailsBody =
        document.getElementById("detailsBody");


    detailsBody.innerHTML = `

        <div class="details-top">

            ${coverHTML}

            <div class="details-info">

                <h3>
                    ${escapeHTML(manga.title)}
                </h3>

                <div class="details-row">
                    <span class="details-label">
                        Autor:
                    </span>

                    ${escapeHTML(
                        manga.author || "-“"
                    )}
                </div>


                <div class="details-row">
                    <span class="details-label">
                        Verlag:
                    </span>

                    ${escapeHTML(
                        manga.publisher || "â€“"
                    )}
                </div>


                <div class="details-row">
                    <span class="details-label">
                        Status:
                    </span>

                    ${escapeHTML(
                        formatStatus(manga.status)
                    )}
                </div>


                <div class="details-row">
                    <span class="details-label">
                        Genres:
                    </span>

                    ${escapeHTML(genres)}
                </div>


                <div class="details-row">
                    <span class="details-label">
                        Bewertung:
                    </span>

                    ${stars}
                </div>


                <div class="details-row">
                    <span class="details-label">
                        Fortschritt:
                    </span>

                    ${manga.volumeRead}
                    /
                    ${manga.volumeTotal}
                    BÃ¤nde
                </div>


                <div class="progress-container">

                    <div class="progress-bar">

                        <div
                            class="progress-fill"
                            style="width: ${progress}%"
                        ></div>

                    </div>

                </div>

            </div>

        </div>


        ${
            manga.notes
                ? `
                    <h3>Notizen</h3>

                    <div class="details-notes">
                        ${escapeHTML(manga.notes)}
                    </div>
                `
                : ""
        }


        <div class="form-actions">

            <button
                class="secondary-button"
                onclick="closeDetailsModal()"
            >
                SchlieÃŸen
            </button>

            <button
                class="primary-button"
                onclick="closeDetailsModal(); editManga('${manga.id}')"
            >
                Bearbeiten
            </button>

        </div>

    `;


    detailsModal.classList.remove("hidden");

}


/* =========================================================
   RENDERING
========================================================= */

function render() {

    const filteredManga =
        getFilteredManga();


    mangaGrid.innerHTML = "";


    if (filteredManga.length === 0) {

        mangaGrid.style.display = "none";

        emptyState.style.display = "block";

        if (mangaList.length > 0) {

            emptyState.querySelector("h3")
                .textContent =
                "Keine passenden Manga";

            emptyState.querySelector("p")
                .textContent =
                "Ã„ndere deine Suche oder die Filter.";

            emptyState.querySelector("button")
                .style.display = "none";

        } else {

            emptyState.querySelector("h3")
                .textContent =
                "Noch keine Manga vorhanden";

            emptyState.querySelector("p")
                .textContent =
                "FÃ¼ge deinen ersten Manga hinzu und baue deine persÃ¶nliche Sammlung auf.";

            emptyState.querySelector("button")
                .style.display = "inline-block";

        }

    } else {

        mangaGrid.style.display = "grid";

        emptyState.style.display = "none";

    }


    resultInfo.textContent =
        `${filteredManga.length} Manga`;


    filteredManga.forEach(
        manga => {

            mangaGrid.appendChild(
                createMangaCard(manga)
            );

        }
    );

}


/* =========================================================
   MANGA CARD ERSTELLEN
========================================================= */

function createMangaCard(manga) {

    const card =
        document.createElement("article");

    card.className =
        "manga-card";


    const progress =
        calculateProgress(manga);


    const stars =
        manga.rating > 0
            ? "â­".repeat(manga.rating)
            : "-“";


    let coverHTML;


    if (manga.cover) {

        coverHTML = `
            <img
                class="manga-cover"
                src="${escapeHTML(manga.cover)}"
                alt="Cover von ${escapeHTML(manga.title)}"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            >

            <div
                class="manga-cover-placeholder"
                style="display:none"
            >
                ***
            </div>
        `;

    } else {

        coverHTML = `
            <div class="manga-cover-placeholder">
                ***
            </div>
        `;

    }


    const firstGenres =
        manga.genres
            .slice(0, 2)
            .map(
                genre =>
                    `<span class="badge">
                        ${escapeHTML(genre)}
                    </span>`
            )
            .join("");


    card.innerHTML = `

        ${coverHTML}


        <div class="manga-card-content">

            <h3 class="manga-title">
                ${escapeHTML(manga.title)}
            </h3>


            <div class="manga-author">

                ${
                    manga.author
                        ? escapeHTML(manga.author)
                        : "Autor unbekannt"
                }

            </div>


            <div class="manga-meta">

                <span class="badge">
                    ${escapeHTML(
                        formatStatus(manga.status)
                    )}
                </span>

                ${firstGenres}

            </div>


            <div class="rating">
                ${stars}
            </div>


            <div class="progress-container">

                <div class="progress-text">

                    <span>
                        ${manga.volumeRead}
                        /
                        ${manga.volumeTotal}
                        BÃ¤nde
                    </span>

                    <span>
                        ${progress}%
                    </span>

                </div>


                <div class="progress-bar">

                    <div
                        class="progress-fill"
                        style="width: ${progress}%"
                    ></div>

                </div>

            </div>


            <div class="card-actions">

                <button
                    class="card-button details-button"
                    onclick="showDetails('${manga.id}')"
                >
                    Details
                </button>


                <button
                    class="card-button edit-button"
                    onclick="editManga('${manga.id}')"
                >
                    Bearbeiten
                </button>


                <button
                    class="card-button delete-button"
                    onclick="deleteManga('${manga.id}')"
                >
                    LÃ¶schen
                </button>

            </div>

        </div>

    `;


    return card;

}


/* =========================================================
   SUCHE UND FILTER
========================================================= */

searchInput.addEventListener(
    "input",
    render
);

statusFilter.addEventListener(
    "change",
    render
);

genreFilter.addEventListener(
    "change",
    render
);

sortSelect.addEventListener(
    "change",
    render
);


function getFilteredManga() {

    let result =
        [...mangaList];


    /* Suche */

    const search =
        searchInput.value
            .toLowerCase()
            .trim();


    if (search) {

        result =
            result.filter(
                manga => {

                    const title =
                        manga.title
                            .toLowerCase();

                    const author =
                        manga.author
                            .toLowerCase();

                    const genres =
                        manga.genres
                            .join(" ")
                            .toLowerCase();

                    return (
                        title.includes(search) ||
                        author.includes(search) ||
                        genres.includes(search)
                    );

                }
            );

    }


    /* Status */

    const selectedStatus =
        statusFilter.value;


    if (selectedStatus !== "all") {

        result =
            result.filter(
                manga =>
                    manga.status === selectedStatus
            );

    }


    /* Genre */

    const selectedGenre =
        genreFilter.value;


    if (selectedGenre !== "all") {

        result =
            result.filter(
                manga =>
                    manga.genres.includes(
                        selectedGenre
                    )
            );

    }


    /* Sortierung */

    const sort =
        sortSelect.value;


    if (sort === "titleAsc") {

        result.sort(
            (a, b) =>
                a.title.localeCompare(
                    b.title,
                    "de"
                )
        );

    }


    if (sort === "titleDesc") {

        result.sort(
            (a, b) =>
                b.title.localeCompare(
                    a.title,
                    "de"
                )
        );

    }


    if (sort === "ratingDesc") {

        result.sort(
            (a, b) =>
                b.rating - a.rating
        );

    }


    if (sort === "ratingAsc") {

        result.sort(
            (a, b) =>
                a.rating - b.rating
        );

    }


    if (sort === "progressDesc") {

        result.sort(
            (a, b) =>
                calculateProgress(b) -
                calculateProgress(a)
        );

    }


    if (sort === "progressAsc") {

        result.sort(
            (a, b) =>
                calculateProgress(a) -
                calculateProgress(b)
        );

    }


    if (sort === "newest") {

        result.sort(
            (a, b) =>
                new Date(b.createdAt) -
                new Date(a.createdAt)
        );

    }


    return result;

}


/* =========================================================
   STATISTIK
========================================================= */

function updateStatistics() {

    const totalManga =
        mangaList.length;


    const totalVolumes =
        mangaList.reduce(
            (sum, manga) =>
                sum + Number(manga.volumeTotal),
            0
        );


    const totalRead =
        mangaList.reduce(
            (sum, manga) =>
                sum + Number(manga.volumeRead),
            0
        );


    const ratedManga =
        mangaList.filter(
            manga =>
                manga.rating > 0
        );


    let average =
        "-“";


    if (ratedManga.length > 0) {

        const ratingSum =
            ratedManga.reduce(
                (sum, manga) =>
                    sum + manga.rating,
                0
            );


        average =
            (
                ratingSum /
                ratedManga.length
            ).toFixed(1);

    }


    mangaCount.textContent =
        totalManga;

    volumeCount.textContent =
        totalVolumes;

    readCount.textContent =
        totalRead;

    averageRating.textContent =
        average;

}


/* =========================================================
   GENRE-FILTER AKTUALISIEREN
========================================================= */

function updateGenreFilter() {

    const currentValue =
        genreFilter.value;


    const genres =
        new Set();


    mangaList.forEach(
        manga => {

            manga.genres.forEach(
                genre =>
                    genres.add(genre)
            );

        }
    );


    genreFilter.innerHTML =
        `<option value="all">
            Alle Genres
        </option>`;


    [...genres]
        .sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "de"
                )
        )
        .forEach(
            genre => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    genre;

                option.textContent =
                    genre;

                genreFilter.appendChild(
                    option
                );

            }
        );


    if (
        [...genres].includes(
            currentValue
        )
    ) {

        genreFilter.value =
            currentValue;

    }

}


/* =========================================================
   FORTSCHRITT BERECHNEN
========================================================= */

function calculateProgress(manga) {

    if (
        !manga.volumeTotal ||
        manga.volumeTotal <= 0
    ) {

        return 0;

    }


    return Math.min(
        100,
        Math.round(
            (
                manga.volumeRead /
                manga.volumeTotal
            ) * 100
        )
    );

}


/* =========================================================
   STATUS FORMATIEREN
========================================================= */

function formatStatus(status) {

    const statusNames = {

        laufend: "Laufend",

        abgeschlossen: "Abgeschlossen",

        pausiert: "Pausiert",

        abgebrochen: "Abgebrochen",

        wunschliste: "Wunschliste"

    };


    return (
        statusNames[status] ||
        status
    );

}


/* =========================================================
   MODAL SCHLIESSEN
========================================================= */

closeModalButton.addEventListener(
    "click",
    closeMangaModal
);

cancelButton.addEventListener(
    "click",
    closeMangaModal
);


function closeMangaModal() {

    mangaModal.classList.add(
        "hidden"
    );

    mangaForm.reset();

    editingMangaId = null;

}


/* =========================================================
   DETAILS MODAL SCHLIESSEN
========================================================= */

closeDetailsButton.addEventListener(
    "click",
    closeDetailsModal
);


function closeDetailsModal() {

    detailsModal.classList.add(
        "hidden"
    );

}


/* =========================================================
   MODAL SCHLIESSEN BEI KLICK AUF HINTERGRUND
========================================================= */

mangaModal.addEventListener(
    "click",
    function (event) {

        if (
            event.target === mangaModal
        ) {

            closeMangaModal();

        }

    }
);


detailsModal.addEventListener(
    "click",
    function (event) {

        if (
            event.target === detailsModal
        ) {

            closeDetailsModal();

        }

    }
);


/* =========================================================
   ESC-TASTE
========================================================= */

document.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Escape") {

            closeMangaModal();

            closeDetailsModal();

        }

    }
);


/* =========================================================
   EXPORT
========================================================= */

exportButton.addEventListener(
    "click",
    exportData
);


function exportData() {

    const data = {

        version: 1,

        exportedAt:
            new Date().toISOString(),

        manga:
            mangaList

    };


    const json =
        JSON.stringify(
            data,
            null,
            2
        );


    const blob =
        new Blob(
            [json],
            {
                type:
                    "application/json"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    const date =
        new Date()
            .toISOString()
            .slice(
                0,
                10
            );


    link.href =
        url;

    link.download =
        `manga-backup-${date}.json`;


    link.click();


    URL.revokeObjectURL(
        url
    );

}


/* =========================================================
   IMPORT
========================================================= */

importButton.addEventListener(
    "click",
    function () {

        importFile.click();

    }
);


importFile.addEventListener(
    "change",
    function (event) {

        const file =
            event.target.files[0];


        if (!file) {
            return;
        }


        const reader =
            new FileReader();


        reader.onload =
            function (event) {

                try {

                    const data =
                        JSON.parse(
                            event.target.result
                        );


                    if (
                        !data.manga ||
                        !Array.isArray(
                            data.manga
                        )
                    ) {

                        throw new Error(
                            "UngÃ¼ltige Datei"
                        );

                    }


                    const confirmed =
                        confirm(
                            "MÃ¶chtest du diese Sammlung importieren? Deine aktuelle Sammlung wird ersetzt."
                        );


                    if (!confirmed) {
                        return;
                    }


                    mangaList =
                        data.manga;


                    saveManga();

                    updateGenreFilter();

                    render();

                    updateStatistics();


                    alert(
                        "Die Sammlung wurde erfolgreich importiert."
                    );


                } catch (error) {

                    console.error(
                        error
                    );

                    alert(
                        "Die Datei konnte nicht importiert werden."
                    );

                }

            };


        reader.readAsText(
            file
        );


        importFile.value = "";

    }
);


/* =========================================================
   ALLE DATEN LÃ–SCHEN
========================================================= */

deleteAllButton.addEventListener(
    "click",
    function () {

        if (
            mangaList.length === 0
        ) {

            alert(
                "Es sind keine Daten vorhanden."
            );

            return;

        }


        const confirmed =
            confirm(
                "ACHTUNG: Dadurch wird deine komplette Manga-Sammlung gelÃ¶scht. MÃ¶chtest du wirklich fortfahren?"
            );


        if (!confirmed) {
            return;
        }


        const secondConfirmation =
            confirm(
                "Wirklich ALLE Manga lÃ¶schen?"
            );


        if (!secondConfirmation) {
            return;
        }


        mangaList = [];


        saveManga();

        render();

        updateStatistics();

        updateGenreFilter();

    }
);


/* =========================================================
   ID ERSTELLEN
========================================================= */

function createId() {

    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2)
    );

}


/* =========================================================
   HTML SICHER MACHEN
========================================================= */

function escapeHTML(text) {

    if (
        text === null ||
        text === undefined
    ) {

        return "";

    }


    return String(text)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}