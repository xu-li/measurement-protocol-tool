(function (window, $, undefined) {
    var app = {
        data: {
            isHTTPS: false,
            fields: {
                v: 1,                      // Protocol Version
                tid: 'UA-44139001-2',      // Tracking ID
                cid: new Date().getTime(), // Client ID
                t: 'pageview',             // Hit type
                dl: location.href,         // Document location URL
                z: new Date().getTime()    // Cache Buster
            }
        },

        config: null,

        getSectionConfig: function (section) {
            var config = $.grep(app.config, function (e) {
                return e.id === section;
            });

            if (config.length !== 1) {
                return null;
            }
            return config[0];
        },

        getFieldValue: function (field) {
            return app.data.fields.hasOwnProperty(field) ? app.data.fields[field] : '';
        },

        getGAUrl: function () {
            return app.data.isHTTPS ? "https://ssl.google-analytics.com/collect" : "http://www.google-analytics.com/collect";
        }
    };

    function bootstrap() {
        $.getJSON("js/config.json").done(function (response) {
            app.config = response;

            renderList();
            bindEvents();
            updatePreview();
            showDefaultForm();
        });
    }

    function renderList() {
        var $sections = $("#sections");
        $.each(app.config, function(i, section) {
            var $li = $("<li><a href='javascript:;'></a></li>");
            $li.attr("data-id", section.id).find("a").text(section.label);

            $sections.append($li);
        });

        return $sections;
    }

    function bindEvents() {
        $("#sections").on("click", "li", function (e) {
            var $target = $(e.currentTarget);
            $target.siblings().removeClass("pure-menu-selected");
            $target.addClass("pure-menu-selected");
            renderSection($target.attr("data-id"));
        });

        $("#form").on("input", "input", function (e) {
            var $target = $(e.currentTarget),
                id = $target.attr("id");
            app.data.fields[id] = $target.val();
            updatePreview();
        });

        $("#form").on("click", ".btn-add-more", function (e) {
            var $target = $(e.currentTarget),
                $div = $target.parent(),
                $cloned = $div.prev().clone(),
                name = $cloned.find("input").attr("name"),
                prefix = name.substring(0, 2),
                label,
                total;

            label = $cloned.find("label").text();
            total = $("#form").find("input[name='" + name + "']").size();
            $cloned.insertBefore($div);

            $cloned.find("label").attr("for", prefix + total).text(label.replace(new RegExp(prefix + "[0-9]+"), prefix + total));
            $cloned.find("input").attr("id", prefix + total).val("").focus();
        });

        $("#btn-submit").click(function () {
            var $btn = $(this);
            $btn.text("Sending...");
            $.ajax({
                type: "POST",
                url: app.getGAUrl(),
                data: app.data.fields,
                complete: function (jqXHR, textStatus) {
                    app.data.fields.z = new Date().getTime();
                    $btn.text("Send");

                    console.log(jqXHR.statusCode() + ": " + textStatus);
                }
            });

            ga && ga('send', 'event', 'Default', 'Send');
        });
    };

    function updatePreview() {
        var $preview = $("#preview"),
            link = app.getGAUrl(),
            fields = "";
        $.each(app.data.fields, function (k, v) {
            if (v) {
                fields += encodeURIComponent(k) + "=" + encodeURIComponent(v) + "&";
            }
        });
        fields = fields.length > 0 ? fields.substr(0, fields.length - 1) : '';

        $preview.html("<p>POST: " + link + "</p><p><br /></p><p>" + fields + "</p>");
    }

    function showDefaultForm() {
        $("#sections").find("li:first").click();
    }

    function renderSection(section) {
        var config = app.getSectionConfig(section),
            $fieldset = $("#form fieldset");

        // clear old html
        $fieldset.html("");

        // legend
        $fieldset.append($("<legend />").text(config.label));

        // fields
        $.each(config.fields, function (i, field) {
            renderField($fieldset, field);
        });

        // focus
        $fieldset.find("input:first").focus();
    }

    function renderField($fieldset, field) {
        if (field.id === 'cd[1-9][0-9]*') {
            // for Custom Dimension
            renderCustomField($fieldset, field, 'cd');
        } else if (field.id === 'cm[1-9][0-9]*') {
            // for Custom Metric
            renderCustomField($fieldset, field, 'cm');
        } else {
            renderSimpleField($fieldset, field);
        }
    }

    function renderSimpleField($fieldset, field, overrides) {
        var $row, $label, $input, $helper, id;
        overrides = overrides || {};

        id = overrides.hasOwnProperty("id") ? overrides.id : field.id;

        $input = $("<input />").attr({
            "id": id,
            "name": field.id,
            "class": "pure-u-3-4",
            "type": "text",
            "value": overrides.hasOwnProperty("value") ? overrides.value : app.getFieldValue(field.id)
        });
        $label = $("<label />").attr({
            "for": id,
            "class": "pure-u-1-4"
        }).text(overrides.hasOwnProperty("label") ? overrides.label : field.label);

        $helper = $("<p class='helper'></p>").text(field.helper);

        $row = $("<div class='field-row'></div>").append($label).append($input).append($helper);

        $fieldset.append($row);
    }

    function renderCustomField($fieldset, field, key) {
        var i = 0,
            name = '',
            value = '',
            $row;

        // max 20 for free accounts
        for (;i < 20; ++i) {
            name = key + i;
            value = app.getFieldValue(name);
            renderSimpleField($fieldset, field, {
                id: name,
                label: field.label + "(" + name + ")",
                value: value
            });

            if (!value) {
                break;
            }
        }

        // add an add more
        $row = $("<div class='field-row field-row-add-more'></div>").append("<a href='javascript:;' class='pure-button btn-add-more'>Add more</a>");
        $fieldset.append($row);
    }
    
    /**
     * Generate the raw configs
     *
     * HOW TO USE
     * 1. Visit https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters
     * 2. Open Chrome developer tool
     * 3. Copy & Paste this function and run it
     */
    function generateConfigs() {
        var configs = [];
        $("div[itemprop='articleBody']").children().each(function (i, child) {
            var tagName = child.tagName.toUpperCase();
            if (tagName === 'H2') {
                configs.push({
                    id: child.id,
                    label: child.textContent,
                    fields: []
                });
            } else if (tagName === 'H3') {
                configs[configs.length - 1].fields.push({
                    id: child.id,
                    label: $(child).find("a").text()
                });
            } else if (tagName === 'DIV' && child.className === 'ind') {
                var section = configs[configs.length - 1];
                var field = section.fields[section.fields.length - 1]
                field.required = $(child).find("p:first strong").size() > 0;
                field.helper = $(child).find("p:eq(1)").text();
            }
        });
        console.log(configs);
    }

    // register bootstrap
    $(document).ready(bootstrap);

    // export
    window.app = app;
}(window, jQuery));
