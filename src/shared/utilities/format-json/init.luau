local function add_indent(level)
    return string.rep("    ", level)
end

local function formatJson(json_str)
    local result = {}
    local level = 0
    local in_string = false

    for i = 1, #json_str do
        local char = json_str:sub(i, i)
        local prev_char = json_str:sub(i - 1, i - 1)

        if char == '"' and prev_char ~= '\\' then
            in_string = not in_string
            table.insert(result, char)
        elseif not in_string then
            if char == '{' or char == '[' then
                table.insert(result, char)
                level = level + 1
                table.insert(result, "\n" .. add_indent(level))
            elseif char == '}' or char == ']' then
                level = level - 1
                table.insert(result, "\n" .. add_indent(level) .. char)
            elseif char == ',' then
                table.insert(result, char)
                table.insert(result, "\n" .. add_indent(level))
            elseif char ~= ' ' and char ~= '\n' and char ~= '\t' then
                table.insert(result, char)
            end
        else
            table.insert(result, char)
        end
    end

    return table.concat(result)
end

return {
    formatJson = formatJson;
}