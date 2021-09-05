/**
 * Main execution function
 */
function main() {
    try {
        // Get text to be parsed and text type
        var text = document.getElementById("input-textarea").value;

        var allClasses = "";

        if (text) {
            var beans = getBeanFieldFromJson(text);

            // Convert the data format defined by this program into text
            $(".result-list").html("");
            $.each(beans, function (i, v) {
                var beanText = toBeanText(v);
                var textCss = "";
                if (i != 0) {
                    textCss = "small-text";
                }
                if (i == 1) {
                    $(".result-list").append(
                        "<p class='more-class-tip'>Below are the more classes contain in the basic class</p>"
                    );
                }

                var html =
                    "<div>" +
                    '<textarea class="result ' +
                    textCss +
                    '" >' +
                    beanText +
                    "</textarea></div>";
                $(".result-list").append(html);

                if (i == 0) {
                    allClasses = "" + beanText;
                } else {
                    allClasses = allClasses + "--BREAK--" + beanText;
                }
            });

            $("#download-button").attr("value", allClasses);
            initCopyBtn();
            $(".error-tip").html("").addClass("hide");
        }
    } catch (err) {
        var tip = "";
        if (err.message.indexOf("Parse error on line") != -1) {
            tip = err.message;
        } else {
            tip = "parse error, make sure the json is right";
        }
        $(".error-tip").html(tip).removeClass("hide");
    }
}

/**
 * Convert the data format defined by this program into java bean text
 * @param bean
 * @returns {string}
 */
function toBeanText(bean) {
    var beanFields = bean.val;
    var className = bean.name;

    var importText = "";
    var fieldText = "";
    var setterText = "";
    var typeSet = {};

    var mCounter = 0;

    // Iterate through each attribute in turn
    for (key in beanFields) {
        mCounter++;

        //If there is an underscored attribute name, change it to camel case
        var camelKey = camelCase(key);
        //  if (camelKey != key) {
        // 标准要用Jackson工具包做转换
        fieldText += '    @JsonProperty("' + key + '")';
        shoudImportJackson = true;
        // }

        // Avoid last item coma
        var mComa = ",";
        if (mCounter == Object.keys(beanFields).length) {
            // we are at the last element of the array
            mComa = "";
        }

        fieldText += " val " + camelKey + ": " + beanFields[key] + mComa + "\n";

        var type = beanFields[key];
        if (type.indexOf("List<") > -1) {
            type = beanFields[key].replace("List<", "");
            type = type.replace(">", "");
            typeSet["List"] = "true";
        }
        typeSet[type] = "true";
    }

    importText += "\nimport com.fasterxml.jackson.annotation.JsonProperty";

    var packageName = document.getElementById("package-input").value;
    if (packageName) {
        importText = "package " + packageName + "\n" + importText;
    }

    return (
        importText +
        "\n\n   \ndata class " +
        className +
        " (\n" +
        fieldText +
        setterText +
        ")"
    );
}

function getBeanFieldFromJson(text) {
    text = trimStr(text);

    jsonlint.parse(text);
    if (text[0] === "[" && text[text.length - 1] === "]") {
        let jsonArray = JSON.parse(text);

        let keys = {};

        for (index in jsonArray) {
            for (key in jsonArray[index]) {
                if (!keys.hasOwnProperty(key)) {
                    keys[key] = {
                        isNullable: false,
                        value: jsonArray[index][key],
                    };
                }
            }
        }
        for (key in keys) {
            for (index in jsonArray) {
                if (!Object(jsonArray[index]).hasOwnProperty(key)) {
                    keys[key].isNullable = true;
                }
            }
        }

        let bean = {};
        let attrClassAry = [];

        for (key in keys) {
            let val = keys[key].value;
            bean[key] = getTypeFromJsonVal(
                val,
                key,
                attrClassAry,
                keys[key].isNullable
            );
        }
        let className = document.getElementById("class-input").value;
        if (!className) {
            className = "A";
        } else {
            className = camelCaseWithFirstCharUpper(className);
        }
        bean = { name: className, val: bean };

        return $.merge([bean], attrClassAry);
    } else {
        let jsonObject = JSON.parse(text);

        let bean = {};
        let attrClassAry = [];
        for (key in jsonObject) {
            let val = jsonObject[key];
            bean[key] = getTypeFromJsonVal(val, key, attrClassAry);
        }
        let className = document.getElementById("class-input").value;
        if (!className) {
            className = "A";
        } else {
            className = camelCaseWithFirstCharUpper(className);
        }
        bean = { name: className, val: bean };

        return $.merge([bean], attrClassAry);
    }
}

function getTypeFromJsonVal(val, key, attrClassAry, isNullable = false) {
    // Strip out spaces to avoid some unnecessary conversion errors

    if (val && val.replace) {
        val = val.replace(/ /g, "");
    }
    let suffix = isNullable ? "?" : "";
    var typeofStr = typeof val;
    if (typeofStr === "number") {
        if (isInt(val)) {
            return "Int" + suffix;
        } else {
            return "Double" + suffix;
        }
    } else if (typeofStr === "boolean") {
        return "Boolean" + suffix;
    } else if (isDate(val)) {
        return "String" + suffix; // Date
    } else if (!val) {
        return "String" + suffix;
    } else if (typeofStr === "string") {
        return "String" + suffix;
    } else {
        if (isArray(val)) {
            var type = getTypeFromJsonVal(val[0], key, attrClassAry);
            return "List<" + type + ">" + suffix;
        } else {
            // Will come here，The attribute value is a json，The attribute type is a custom class
            var typeName = camelCaseWithFirstCharUpper(key);
            var bean = {};
            for (key in val) {
                var fieldValue = val[key];
                bean[key] = getTypeFromJsonVal(fieldValue, key, attrClassAry);
            }
            attrClassAry.push({ name: typeName, val: bean });
            return typeName + suffix;
        }
    }
}

/**
 * Initialize copy button
 * @param id
 */
function initCopyBtn() {
    $(".copy-button").each(function (i, v) {
        var client = new ZeroClipboard(v);
        client.on("copy", function (event) {
            var clipboard = event.clipboardData;
            var data = $(v).siblings("textarea").val();
            clipboard.setData("text/plain", data);
            alert("copy success");
        });
    });
}

document.addEventListener("DOMContentLoaded", function (event) {
    // When the input box is changed, the analysis result is displayed again
    var area = document.getElementById("input-textarea");
    area.innerHTML = document.getElementById("input-example").innerHTML;

    main();

    $("#input-textarea,.config input").live("change", function () {
        main();
    });
});
