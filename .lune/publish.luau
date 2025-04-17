local net = require("@lune/net")
local fs = require("@lune/fs")
local roblox = require("@lune/roblox")
local process = require("@lune/process")
local task = require("@lune/task")

local function loadEnvFile(path)
    local env = {}
    local content = fs.readFile(path)

    for i, line in content:split("\n") do
        local key, value = line:match("^([^=]+)=([^%s]+)$")
        if key and value then
            env[key] = value
        end
    end

    return env
end

local envData = if fs.isFile(".env") then loadEnvFile(".env") else {}
local API_KEY = envData.API_KEY or process.env.API_KEY
local UNIVERSE_ID = 7247182206
local ROBLOSECURITY = envData.ROBLOSECURITY or process.env.ROBLOSECURITY

print("Build project")

process.spawn("rojo", { "build", "--output", "build.rbxl" })

local builtPlace = roblox.deserializePlace(fs.readFile("build.rbxl"))
fs.removeFile("build.rbxl")

print("Getting places...")
local response = net.request(`https://develop.roblox.com/v1/universes/{UNIVERSE_ID}/places?sortOrder=Asc&limit=100`)
local places = net.jsonDecode(response.body).data

local function replace(from: Instance, to: Instance)
	local content = from:GetChildren()

	for i, child in content do
		local prev = to:FindFirstChild(child.Name)
		if prev then
			prev:Destroy()
		end
		
		local cloned = child:Clone();
		cloned.Parent = to
	end
end

local function processPlace(binary: string)
	local place = roblox.deserializePlace(binary)

	replace(builtPlace:GetService("ReplicatedStorage"), place:GetService("ReplicatedStorage"))
	replace(builtPlace:GetService("ServerScriptService"), place:GetService("ServerScriptService"))
	replace(builtPlace:GetService("StarterPlayer"):FindFirstChild("StarterPlayerScripts"), place:GetService("StarterPlayer"):FindFirstChild("StarterPlayerScripts"))

	return roblox.serializePlace(place)
end

local failedPlaces: { [string]: string } = {}
local threadCount = 0
local currentThread = coroutine.running()

local function tryResumeThread()
	if threadCount == 0 then
		coroutine.resume(currentThread)
	end
end

for i, place in places do
	task.spawn(function()
		threadCount += 1

		local success, err = pcall(function()
			print("Downloading place:", place.name)
			local placeData = net.request({
				url = `https://assetdelivery.roblox.com/v1/asset/?id={place.id}`,
				method = "GET",
				headers = {
					Cookie = `.ROBLOSECURITY={ROBLOSECURITY}`,
				},
			})
		
			local readyPlace = processPlace(placeData.body)
		
			print(`publishing: {place.name}`)
			local response = net.request({
				method = "POST",
				url = `https://apis.roblox.com/universes/v1/{UNIVERSE_ID}/places/{place.id}/versions?versionType=Published`,
				body = readyPlace,
				headers = {
					["x-api-key"] = API_KEY,
				}
			})

			if not response.ok then
				failedPlaces[place.name] = response.statusMessage
				return
			end
		
			print(`published: {place.name}`)
		end)

		if not success then
			failedPlaces[place.name] = err
			return
		end

		threadCount -= 1
		tryResumeThread()
	end)
end

coroutine.yield()

if next(failedPlaces) ~= nil then
	print("Failed to publish:")
end

for placeName, reason in pairs(failedPlaces) do
	print(`{placeName}: {reason}`)
end
