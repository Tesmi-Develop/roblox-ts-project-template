local CLONE = "_clone"
local BASE = "_base"

local function RepairDataFromDraft<T>(draft: T): T?
	if typeof(draft) ~= "table" then
		return draft
	end

	if draft[CLONE] == nil and draft[BASE] == nil then
		for key, value in draft do
			local val = RepairDataFromDraft(value)
			if not val then continue end
			draft[key] = val
		end

		return draft
	end

	local final = draft[CLONE] or draft[BASE]

	for key, value in final do
		local val = RepairDataFromDraft(value)
		if not val then continue end
		final[key] = val
	end

	return final
end

return RepairDataFromDraft