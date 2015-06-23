var $speeches = null;
var $tags = null;
var $tagButtons = null;
var $resetSearchButton = null;
var $search = null;
var $searchForm = null;
var $body = null;
var $leadQuote = null;
var $imgSource = null;
var $refreshQuoteButton = null;
var $noResults = null;
var $speechCount = null;
var $speechTotal = null;
var FEATURED = null;
var featured_position = 0;

var searchIndex = null;

var filterSpeeches = function() {
    $speeches.hide();

    var $visibleSpeeches = $speeches;
    var query = $search.val();
    var tags = $tags.find('.active').first().data('tag');
    var showReset = false;

    if (query) {
        var results = searchIndex.search(query);
        var slugs = _.pluck(results, 'ref');
        var ids = _.map(slugs, function(s) { return '#' + s });

        $visibleSpeeches = $(ids.join(','));

        showReset = true;
    }

    if (tags) {
        $visibleSpeeches = $visibleSpeeches.filter('.tag-' + tags)

        showReset = true;
    }

    if (showReset) {
        $resetSearchButton.show();
    } else {
        $resetSearchButton.hide();
    }

    $visibleSpeeches.show();

    if ($visibleSpeeches.length > 0){
        $noResults.hide();
        $speechCount.html($visibleSpeeches.length);
        $speechCount.parent('p').show();
    } else {
        $noResults.show();
        $speechCount.html(0);
        $speechCount.parent('p').show();
    }
}

var renderLeadQuote = function() {

    // Indexes into the list of featured quotes using the global state
    // of where you are in the list.
    var context = FEATURED[featured_position];
    if (featured_position == (FEATURED.length - 1)) {
        featured_position = 0;
    } else {
        featured_position += 1;
    }

    // Loads the identified quote with some easing animation.
    var html = JST.quote(context);
    var src = context['img_source'];

    $leadQuote.fadeOut('fast', function(){
        $leadQuote.html(html);
        $leadQuote.fadeIn();
    });
}

var renderMostViewed = function(data) {
    var context = data;

    // Loads the identified quote with some easing animation.
    var html = JST.most_viewed(context);
    $('#most-viewed').html(html);
}

var onTagButtonClick = function() {
    hasher.setHash($(this).data('tag'));
    _gaq.push(['_trackEvent', 'Filters', 'onTagButtonClick', APP_CONFIG.PROJECT_SLUG]);
}

var onResetSearchButtonClick = function() {
    $search.val('');
    hasher.setHash('_');
    _gaq.push(['_trackEvent', 'Filters', 'onResetSearchButtonClick', APP_CONFIG.PROJECT_SLUG]);
}

var onRefreshQuoteButtonClick = function() {
    renderLeadQuote();
    _gaq.push(['_trackEvent', 'Featured Quote', 'onRefreshQuoteButtonClick', APP_CONFIG.PROJECT_SLUG]);
}

var onFormSubmit = function(e) {
    e.preventDefault();
}

var onHashChanged = function(new_hash, old_hash) {
    if (new_hash === '_') { new_hash = ''; }

    if (new_hash === '') {
        $tagButtons.removeClass('active');
    } else {
        var $this = $('div.tags li a[data-tag="' + new_hash + '"]');
        $tagButtons.not($this).removeClass('active');
        $this.toggleClass('active');

        _.defer(function(){
            $.scrollTo('.tags', { duration: 350 })
        });
    }

    filterSpeeches();
};

$(function() {
    $speeches = $('.speeches .speech');
    $tags = $('.tags');
    $tagButtons = $('.tags .btn').not('.reset-tags');
    $resetSearchButton = $('.reset-tags');
    $searchForm = $('.filters form');
    $search = $('#search');
    $body = $('body');
    $refreshQuoteButton = $('#refresh-quote');

    if ($body.hasClass('homepage')){
        $leadQuote = $('#lead-quote');
        $imgSource = $('.img-source');
        $noResults = $('#no-results');
        $speechCount = $('.speech-count');
        $speechTotal = $('.speech-total');

        $tagButtons.on('click', onTagButtonClick);
        $resetSearchButton.on('click', onResetSearchButtonClick);
        $search.on('keyup', filterSpeeches);
        $refreshQuoteButton.on('click', onRefreshQuoteButtonClick);
        $searchForm.on('submit', onFormSubmit);

        // Get the featured speeches.
        FEATURED = _.where(SPEECHES, {'featured': 'y'});

        // Add the initial speech slug to the list.
        FEATURED.push(_.where(SPEECHES, {'slug': APP_CONFIG.INITIAL_SPEECH_SLUG })[0])

        for (i = 0; i < SPEECHES.length; i++) {
            SPEECHES[i]['simple_name'] = SPEECHES[i]['name'].replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()']/g, '')
        }

        // Set up the search index.
        searchIndex = lunr(function () {
            this.field('name', {boost: 10})
            this.field('simple_name', {boost: 10})
            this.field('school')
            this.field('year')
            this.ref('slug')
        })
        _.each(SPEECHES, function(speech) { searchIndex.add(speech); });

        hasher.changed.add(onHashChanged);
        hasher.initialized.add(onHashChanged);
        hasher.init();

        $speechTotal.html(SPEECHES.length);
    }
});
