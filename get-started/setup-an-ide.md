# Setup an IDE

## vs code

## goland

You can use GoLand to easily run or debug TiDB in many situations.

0. make sure your `go` and `dlv` work well.
1. open TiDB project in GoLand.
2. add these config files to `<tidb-dir>/.idea/runConfigurations/` directory:

  - unistore_4000.xml
  ```xml
  <component name="ProjectRunConfigurationManager">
    <configuration default="false" name="unistore 4000" type="GoApplicationRunConfiguration" factoryName="Go Application">
      <module name="tidb" />
      <working_directory value="$PROJECT_DIR$" />
      <kind value="PACKAGE" />
      <filePath value="$PROJECT_DIR$" />
      <package value="github.com/pingcap/tidb/tidb-server" />
      <directory value="$PROJECT_DIR$" />
      <method v="2" />
    </configuration>
  </component>
  ```

  - playground_attach_4001.xml
  ```xml
  <component name="ProjectRunConfigurationManager">
    <configuration default="false" name="playground attach 4001" type="GoApplicationRunConfiguration" factoryName="Go Application">
      <module name="tidb" />
      <working_directory value="$PROJECT_DIR$" />
      <parameters value="--path=pd0:2379 --store=tikv --status=10081 -P 4001 " />
      <kind value="PACKAGE" />
      <filePath value="$PROJECT_DIR$/tidb-server/main.go" />
      <package value="github.com/pingcap/tidb/tidb-server" />
      <directory value="$PROJECT_DIR$" />
      <method v="2" />
    </configuration>
  </component>
  ```
  
  - unit_test.xml
  ```xml
  <component name="ProjectRunConfigurationManager">
    <configuration default="false" name="unit test" type="GoTestRunConfiguration" factoryName="Go Test">
      <module name="tidb" />
      <working_directory value="$PROJECT_DIR$" />
      <go_parameters value="-i" />
      <framework value="gocheck" />
      <kind value="DIRECTORY" />
      <package value="github.com/pingcap/tidb" />
      <directory value="$PROJECT_DIR$/planner/core" />
      <filePath value="$PROJECT_DIR$" />
      <pattern value="TestEnforceMPP" />
      <method v="2" />
    </configuration>
  </component>
  ```

3. Now you can see the run/debug configs in the right upper corner, but if there aren't, you can still add them manually.
![configs](https://user-images.githubusercontent.com/30543181/118766709-63ea0200-b8af-11eb-9176-bc3fb6f566d4.png)



 - the first config is `unistore 4000`, which makes you can run/debug TiDB independently without TiKV/PD/TiFlash.
 ![unistore config](https://user-images.githubusercontent.com/30543181/118766909-a4498000-b8af-11eb-8e20-9e2aff1a0b44.png)
 ![run in unistore](https://user-images.githubusercontent.com/30543181/118769645-f9d35c00-b8b2-11eb-9048-1b696ead2815.png)

 - the second config is `playground attach 4001`, which makes you can run/debug TiDB to attach a existed cluster, for example, [`tiup playground`](https://docs.pingcap.com/zh/tidb/stable/tiup-playground).
   After it started, you can connect to the origin TiDB by port 4000, or connect to your TiDB by port 4001 at the same time.
![playground attach config](https://user-images.githubusercontent.com/30543181/118767132-f38fb080-b8af-11eb-93cd-bdbe95ff2102.png)
![debug](https://user-images.githubusercontent.com/30543181/118771847-9860bc80-b8b5-11eb-856f-4b4f21d035de.png)


 - the third config is `unit test`, which makes you can run/debug TiDB's unit test.
![unit test config](https://user-images.githubusercontent.com/30543181/118767852-dad3ca80-b8b0-11eb-86ae-306bd4a995bc.png)
![unit test](https://user-images.githubusercontent.com/30543181/118769164-7285e880-b8b2-11eb-923e-c3eaffcddfd6.png)
   And you can modify the `Directory` and `Pattern` to run other tests.
 



## vim \(optional\)

## emacs \(optional\)
